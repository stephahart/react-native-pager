import React, {
  useState,
  createContext,
  useContext,
  useEffect,
  useRef,
} from 'react';
import {
  StyleSheet,
  LayoutChangeEvent,
  ViewStyle,
  InteractionManager,
} from 'react-native';
import Animated, { Easing } from 'react-native-reanimated';
import {
  PanGestureHandler,
  State,
  PanGestureHandlerProperties,
} from 'react-native-gesture-handler';

export type SpringConfig = {
  damping: Animated.Adaptable<number>;
  mass: Animated.Adaptable<number>;
  stiffness: Animated.Adaptable<number>;
  overshootClamping: Animated.Adaptable<number> | boolean;
  restSpeedThreshold: Animated.Adaptable<number>;
  restDisplacementThreshold: Animated.Adaptable<number>;
  toValue: Animated.Adaptable<number>;
};

// copied from react-native-reanimated for now, can't get the export
export enum Extrapolate {
  EXTEND = 'extend',
  CLAMP = 'clamp',
  IDENTITY = 'identity',
}

interface InterpolationConfig {
  inputRange: ReadonlyArray<Animated.Adaptable<number>>;
  outputRange: ReadonlyArray<Animated.Adaptable<number>>;
  extrapolate?: Extrapolate;
  extrapolateLeft?: Extrapolate;
  extrapolateRight?: Extrapolate;
}

type iInterpolationFn = (
  offset: Animated.Node<number>
) => Animated.Node<number>;

interface iInterpolationConfig extends InterpolationConfig {
  unit?: string;
}

type iTransformProp = {
  [transformProp: string]: iInterpolationConfig | iInterpolationFn;
};

export interface iPageInterpolation {
  [animatedProp: string]:
    | iTransformProp[]
    | iInterpolationConfig
    | iInterpolationFn;
}

const VERTICAL = 1;
const HORIZONTAL = 2;
const UNSET = -1;
const TRUE = 1;
const FALSE = 0;

const {
  // @ts-ignore
  event,
  defined,
  block,
  Value,
  divide,
  cond,
  eq,
  add,
  stopClock,
  Clock,
  set,
  clockRunning,
  multiply,
  sub,
  call,
  max,
  min,
  modulo,
  not,
  greaterThan,
  abs,
  ceil,
  interpolate,
  concat,
  neq,
  and,
  proc,
  startClock,
  spring,
  greaterOrEq,
} = Animated;

export interface iPager {
  onChange?: (nextIndex: number) => void;
  children: React.ReactNode[];
  springConfig?: Partial<SpringConfig>;
  pageInterpolation?: iPageInterpolation;
  panProps?: Partial<PanGestureHandlerProperties>;
  pageSize?: number;
  threshold?: number;
  minIndex?: number;
  maxIndex?: number;
  adjacentChildOffset?: number;
  style?: ViewStyle;
  containerStyle?: ViewStyle;
  type?: 'horizontal' | 'vertical';
  clamp?: {
    prev?: number;
    next?: number;
  };
  clampDrag?: {
    prev?: number;
    next?: number;
  };
  loop: boolean;
}
const REALLY_BIG_NUMBER = 1000000000;

// at its core, this component converts an activeIndex integer value to an Animated.Value
// this animated value represents all intermediate values of a pager, e.g when a user is dragging, the index
// value might be anything between 1 -> 2 as they are moving. when a gesture is completed, it figures out
// the next activeIndex, snaps to it and passes it back. it also handles snapping to different indices when the activeIndex
// prop changes.

// all styles and positioning of child screens can be computed from this one value, based on a childs index and
// any style config props passed to the Pager.

// pretty much all other props passed to the Pager are configurations for different behaviours of what is described above

function Pager({
  onChange,
  children,
  springConfig,
  panProps = {},
  pageSize = 1,
  threshold = 0.1,
  minIndex,
  maxIndex: parentMax,
  adjacentChildOffset = 5,
  style,
  containerStyle,
  type = 'horizontal',
  pageInterpolation,
  clamp = {},
  clampDrag = {},
  loop = true,
}: iPager) {
  const {
    animatedValue,
    animatedIndex,
    nextIndex,
    activeIndex,
    setActiveIndex,
    content,
  } = useContext(PagerContext);

  const numberOfScreens = content ? content.length : 0;
  const animatedNumberOfScreens = memoize(new Value(numberOfScreens));
  animatedNumberOfScreens.setValue(numberOfScreens);
  const initialIndex = memoize(activeIndex);
  const animatedLoop = memoize(new Value(loop ? 1 : 0));
  animatedLoop.setValue(loop ? 1 : 0);

  const dragX = memoize(new Value(0));
  const dragY = memoize(new Value(0));
  const gestureState = memoize(new Value(0));
  const activeIndexSyncRequested = useRef(false);
  const activeIndexRef = useRef(-1);

  const handleGesture = memoize(
    event(
      [
        {
          nativeEvent: {
            translationX: dragX,
            translationY: dragY,
          },
        },
      ],
      { useNativeDriver: true }
    )
  );

  const handleStateChange = memoize(
    event(
      [
        {
          nativeEvent: {
            state: gestureState,
          },
        },
      ],
      {
        useNativeDriver: true,
      }
    )
  );

  let initialWidth = UNSET;
  if (style && style.width) {
    if (typeof style.width === 'number') {
      initialWidth = style.width;
    }
  }

  let initialHeight = UNSET;
  if (style && style.height) {
    if (typeof style.height === 'number') {
      initialHeight = style.height;
    }
  }

  const [width, setWidth] = useState(initialWidth);
  const [height, setHeight] = useState(initialHeight);

  // assign references based on vertical / horizontal configurations
  const dimension = memoize(new Value(0));
  const targetDimension = type === 'vertical' ? 'height' : 'width';
  const targetTransform = type === 'vertical' ? 'translateY' : 'translateX';
  const delta = type === 'vertical' ? dragY : dragX;

  const layoutDimension = type === 'vertical' ? height : width;

  // `totalDimension` on the container view is required for android layouts to work properly
  // otherwise translations move the panHandler off of the screen
  // set the total width of the container view to the sum width of all the screens
  const totalDimension = multiply(dimension, animatedNumberOfScreens);

  function handleLayout({ nativeEvent: { layout } }: LayoutChangeEvent) {
    layout.width !== width && setWidth(layout.width);
    layout.height !== height && setHeight(layout.height);
  }

  const TYPE = type === 'vertical' ? VERTICAL : HORIZONTAL;

  // props that might change over time should be reactive:
  const animatedThreshold = useAnimatedValue(threshold);
  const clampDragPrev = useAnimatedValue(clampDrag.prev, REALLY_BIG_NUMBER);
  const clampDragNext = useAnimatedValue(clampDrag.next, REALLY_BIG_NUMBER);
  const animatedMaxIndex: any =
    parentMax === undefined ? new Value() : new Value(parentMax);
  const animatedMinIndex: any =
    minIndex === undefined ? new Value() : new Value(minIndex);

  // pan event values to track
  const dragStart = memoize(new Value(0));
  const swiping = memoize(new Value(FALSE));
  const _animatedActiveIndex = memoize(new Value(initialIndex));
  const change = memoize(
    cond(
      and(
        eq(_animatedActiveIndex, 0),
        greaterThan(animatedValue, sub(animatedNumberOfScreens, 1))
      ),
      sub(animatedNumberOfScreens, animatedValue),
      sub(_animatedActiveIndex, animatedValue)
    )
  );
  const absChange = memoize(abs(change));
  const shouldTransition = memoize(greaterThan(absChange, animatedThreshold));
  const withinRange = memoize(
    proc(n => min(max(n as any, animatedMinIndex), animatedMaxIndex))
  );
  const indexChange = memoize(new Value(0));

  // clamp drag values between the configured clamp props
  // e.g prev => 0.5, next => 0.5 means change can only be between [-0.5, 0.5]
  // minMax order is reversed because next is negative in translation values
  const clampedDelta = memoize(
    min(
      max(divide(delta, dimension), multiply(clampDragNext, -1)),
      clampDragPrev
    )
  );

  const clock = memoize(new Clock());

  // animatedIndex represents pager position with an animated value
  // this value is used to compute the transformations of the container screen
  // its also used to compute the offsets of child screens, and any other consumers
  const prevIdx = memoize(new Value(initialIndex));

  const syncActiveIndex = memoize(() =>
    call([modulo(nextIndex, animatedNumberOfScreens)], ([idx]) => {
      activeIndexRef.current = idx;
      if (!activeIndexSyncRequested.current) {
        activeIndexSyncRequested.current = true;
        InteractionManager.runAfterInteractions(() => {
          activeIndexSyncRequested.current = false;
          setActiveIndex(activeIndexRef.current);
          onChange?.(activeIndexRef.current);
        });
      }
    })
  );

  const _animatedValue = memoize(
    block([
      cond(
        eq(gestureState, State.ACTIVE),
        [
          cond(clockRunning(clock), stopClock(clock)),
          // captures the initial drag value on first drag event
          cond(swiping, 0, [set(dragStart, animatedValue), set(swiping, TRUE)]),
          set(animatedValue, sub(dragStart, clampedDelta)),
        ],
        [
          // on release -- figure out if the index needs to change, and what index it should change to
          cond(swiping, [
            set(swiping, FALSE),
            cond(shouldTransition, [
              // rounds index change if pan gesture greater than just one screen
              set(indexChange, ceil(absChange)),
              // nextIndex set to the next snap point
              set(
                nextIndex,
                cond(
                  greaterThan(change, 0),
                  [
                    cond(
                      defined(animatedMaxIndex),
                      [withinRange(sub(_animatedActiveIndex, indexChange))],
                      [
                        cond(
                          eq(_animatedActiveIndex, 0),
                          sub(animatedNumberOfScreens, 1),
                          sub(_animatedActiveIndex, indexChange)
                        ),
                      ]
                    ),
                  ],
                  [
                    cond(
                      defined(animatedMaxIndex),
                      [withinRange(add(_animatedActiveIndex, indexChange))],
                      [add(_animatedActiveIndex, indexChange)]
                    ),
                  ]
                )
              ),
            ]),
          ]),

          // set animatedActiveIndex for next swipe event
          set(_animatedActiveIndex, modulo(nextIndex, animatedNumberOfScreens)),
          set(animatedIndex, modulo(nextIndex, animatedNumberOfScreens)),
          set(
            animatedValue,
            runSpring(
              clock,
              animatedValue,
              nextIndex,
              animatedNumberOfScreens,
              springConfig,
              syncActiveIndex
            )
          ),
        ]
      ),
      cond(not(eq(prevIdx, nextIndex)), [set(prevIdx, nextIndex)]),
      set(animatedValue, modulo(animatedValue, animatedNumberOfScreens)),
      animatedValue,
    ])
  );

  const clampPrevValue = useAnimatedValue(
    clamp.prev,
    add(animatedNumberOfScreens, 1)
  );
  const clampNextValue = useAnimatedValue(
    clamp.next,
    add(animatedNumberOfScreens, 1)
  );

  // stop child screens from translating beyond the bounds set by clamp props:
  const minimum = memoize(
    multiply(sub(_animatedValue, clampPrevValue), dimension)
  );

  const maximum = memoize(
    multiply(add(_animatedValue, clampNextValue), dimension)
  );

  const animatedPageSize = useAnimatedValue(pageSize);

  // container offset -- this is the window of focus for active screens
  // it shifts around based on the animatedIndex value
  const containerTranslation = memoize(
    cond(
      eq(animatedNumberOfScreens, 1),
      0,
      multiply(_animatedValue, dimension, animatedPageSize, -1)
    )
  );

  // grabbing the height property from the style prop if there is no container style, this reduces
  // the chances of messing up the layout with containerStyle configurations
  // can be overridden by the prop itself, but its likely that this is what is intended most of the time
  // also has the benefit of covering 100% width of container, meaning better pan coverage on android
  const defaultContainerStyle =
    style && style.height ? { height: style.height } : undefined;

  const pages = () => {
    // waiting for initial layout - except when testing
    if (width === UNSET) {
      return null;
    }

    // slice the children that are rendered by the <Pager />
    // this enables very large child lists to render efficiently
    // the downside is that children are unmounted after they pass this threshold
    // it's an optional prop, however a default value of ~20 is set here to prevent
    // possible performance bottlenecks to those not aware of the prop or what it does

    // this will slice adjacentChildOffset number of children previous and after
    // the current active child index into a smaller child array
    // TODO: render end of list if index = 0
    // inclusive
    const startIndex =
      2 * adjacentChildOffset + 1 >= numberOfScreens
        ? 0
        : moduloJs(activeIndex - adjacentChildOffset, numberOfScreens);
    // exclusive
    const endIndex =
      2 * adjacentChildOffset + 1 >= numberOfScreens
        ? numberOfScreens
        : moduloJs(activeIndex + adjacentChildOffset + 1, numberOfScreens);

    let adjacentChildren;
    if (startIndex >= endIndex) {
      adjacentChildren = [
        ...children.slice(startIndex, numberOfScreens),
        ...children.slice(0, endIndex),
      ];
    } else {
      adjacentChildren = children.slice(startIndex, endIndex);
    }

    return adjacentChildren.map((child: any, i) => {
      // use map instead of React.Children because we want to track
      // the keys of these children by their index
      // React.Children shifts these key values intelligently, but it
      // causes issues with the memoized values in <Page /> components
      let index = moduloJs(i + startIndex, numberOfScreens);

      return (
        <Page
          key={`${index}-${child.props.content.content_id}`}
          index={index}
          animatedIndex={_animatedValue}
          minimum={minimum}
          maximum={maximum}
          dimension={dimension}
          targetTransform={targetTransform}
          targetDimension={targetDimension}
          pageInterpolation={pageInterpolation}
          animatedNumberOfScreens={animatedNumberOfScreens}
          loop={loop}
        >
          {child}
        </Page>
      );
    });
  };

  // extra Animated.Views below may seem redundant but they preserve applied styles e.g padding and margin
  // of the page views
  return (
    <Animated.View
      style={containerStyle || defaultContainerStyle || { flex: 1 }}
    >
      <Animated.Code
        key={layoutDimension}
        exec={cond(
          // dimension already set to last layout
          and(eq(dimension, width), eq(dimension, height)),
          [],
          [
            cond(
              eq(TYPE, VERTICAL),
              set(dimension, height),
              set(dimension, width)
            ),
          ]
        )}
      />

      <PanGestureHandler
        {...panProps}
        onGestureEvent={handleGesture}
        onHandlerStateChange={handleStateChange}
      >
        <Animated.View style={{ flex: 1 }}>
          <Animated.View style={style || { flex: 1 }}>
            <Animated.View style={{ flex: 1 }} onLayout={handleLayout}>
              <Animated.View
                style={{
                  flex: 1,
                  [targetDimension]: totalDimension,
                  transform: [{ [targetTransform]: containerTranslation }],
                }}
              >
                {pages()}
              </Animated.View>
            </Animated.View>
          </Animated.View>
        </Animated.View>
      </PanGestureHandler>
    </Animated.View>
  );
}

interface iPage {
  children: React.ReactNode;
  index: number;
  minimum: Animated.Node<number>;
  maximum: Animated.Node<number>;
  dimension: Animated.Node<number>;
  targetTransform: 'translateX' | 'translateY';
  targetDimension: 'width' | 'height';
  pageInterpolation: iPageInterpolation | undefined;
  animatedIndex: Animated.Value<number>;
  animatedNumberOfScreens: Animated.Value<number>;
  loop: boolean;
}

const Page = React.memo(function({
  children,
  index,
  minimum,
  maximum,
  dimension,
  targetTransform,
  targetDimension,
  pageInterpolation,
  animatedIndex,
  animatedNumberOfScreens,
  loop,
}: iPage) {
  // compute the absolute position of the page based on index and dimension
  // this means that it's not relative to any other child, which is good because
  // it doesn't rely on a mechanism like flex, which requires all children to be present
  // to properly position pages
  const position = memoize(
    cond(
      eq(animatedNumberOfScreens, 1),
      0,
      cond(
        and(
          eq(index, 0),
          greaterThan(animatedIndex, sub(animatedNumberOfScreens, 1))
        ), // if we're in the last position of the loop, and we're calulcating the position for the first page
        [multiply(animatedNumberOfScreens, dimension)], // position the first item
        multiply(index, dimension) // normal position
      )
    )
  );

  const defaultStyle = memoize({
    // map to height / width value depending on vertical / horizontal configuration
    // this is crucial to getting child views to properly lay out
    [targetDimension]: dimension,
    // min-max the position based on clamp values
    // this means the <Page /> will have a container that is always positioned
    // in the same place, but the inner view can be translated within these bounds
    transform: [
      {
        [targetTransform]: position,
      },
    ],
  });

  const styleOffset = memoize(
    cond(
      eq(animatedNumberOfScreens, 1),
      0,
      cond(
        eq(index, 0),
        cond(
          greaterOrEq(animatedIndex, sub(animatedNumberOfScreens, 1)),
          sub(animatedNumberOfScreens, animatedIndex),
          sub(index, animatedIndex)
        ),
        sub(index, animatedIndex)
      )
    )
  );

  // apply interpolation configs to <Page />
  const interpolatedStyles = memoize(
    interpolateWithConfig(
      styleOffset,
      animatedNumberOfScreens,
      pageInterpolation
    )
  );

  // take out zIndex here as it needs to be applied to siblings
  let { zIndex, ...otherStyles } = interpolatedStyles;

  // zIndex is not a requirement of interpolation
  // it will be clear when someone needs it as views will overlap with some configurations
  if (!zIndex) {
    zIndex = 0;
  }

  return (
    <Animated.View
      style={{
        ...StyleSheet.absoluteFillObject,
        ...defaultStyle,
        zIndex,
      }}
    >
      <Animated.View style={[StyleSheet.absoluteFillObject, otherStyles]}>
        {children}
      </Animated.View>
    </Animated.View>
  );
});

// utility to update animated values without changing their reference
// this is key for using memoized Animated.Values and prevents costly rerenders
function useAnimatedValue(
  value?: number,
  defaultValue: number | Animated.Node<number> = 0
): Animated.Value<number> {
  const initialValue = value !== undefined ? value : defaultValue;
  const animatedValue = memoize(
    typeof defaultValue === 'number'
      ? new Value(initialValue as number)
      : defaultValue
  );

  useEffect(() => {
    if (value !== undefined) {
      animatedValue.setValue(value);
    }
  }, [value, defaultValue]);

  return animatedValue;
}

interface iPagerContext<T> {
  animatedValue: Animated.Value<number>;
  animatedIndex: Animated.Value<number>;
  nextIndex: Animated.Value<number>;
  activeIndex: number;
  setActiveIndex: (idx: number) => void;
  content: T[];
  setContent: (content: T[]) => void;
  setState: (state: PagerState<T>) => void;
}

const PagerContext = createContext<iPagerContext<any>>({
  animatedValue: new Value(0),
  animatedIndex: new Value(0),
  nextIndex: new Value(0),
  activeIndex: 0,
  setActiveIndex: _ => null,
  content: [],
  setContent: _ => null,
  setState: _ => null,
});

interface iPagerProvider {
  children: React.ReactNode;
  initialIndex: number;
}

export interface PagerState<T> {
  activeIndex: number;
  content: T[];
}

const PagerProvider: React.FC<iPagerProvider> = ({
  children,
  initialIndex = 0,
}) => {
  const [state, setState] = useState<PagerState<any>>({
    activeIndex: initialIndex,
    content: null as any,
  });
  const animatedValue = memoize(new Value<number>(initialIndex));
  const animatedIndex = memoize(new Value<number>(initialIndex));
  const nextIndex = memoize(new Value<number>(initialIndex));
  const setActiveIndex = idx => setState(s => ({ ...s, activeIndex: idx }));
  const setContent = content => setState(s => ({ ...s, content: content }));

  return (
    <PagerContext.Provider
      value={{
        animatedValue,
        animatedIndex,
        nextIndex,
        activeIndex: state.activeIndex,
        content: state.content,
        setActiveIndex,
        setContent,
        setState,
      }}
    >
      {typeof children === 'function'
        ? children({
            animatedValue,
            animatedIndex,
            nextIndex,
            activeIndex: state.activeIndex,
            setActiveIndex,
            content: state.content,
            setContent,
            setState,
          })
        : children}
    </PagerContext.Provider>
  );
};

function usePager<T>(): iPagerContext<T> {
  const context = useContext(PagerContext);

  if (context === undefined) {
    throw new Error(`usePager() must be used within a <PagerProvider />`);
  }

  return context;
}

const IndexContext = React.createContext<undefined | number>(undefined);

interface iIndexProvider {
  children: React.ReactNode;
  index: number;
}

function useIndex() {
  const index = useContext(IndexContext);

  if (index === undefined) {
    throw new Error(`useIndex() must be used within an <IndexProvider />`);
  }

  return index;
}

function useAnimatedIndex() {
  const pager = usePager();
  return pager[2];
}

function useOffset(
  index: number,
  animatedNumberOfScreens: Animated.Node<number>
) {
  const animatedIndex = useAnimatedIndex();
  const offset = memoize(
    cond(
      eq(animatedNumberOfScreens, 1),
      0,
      cond(
        eq(index, 0),
        cond(
          greaterOrEq(animatedIndex, sub(animatedNumberOfScreens, 1)),
          sub(animatedNumberOfScreens, animatedIndex),
          sub(index, animatedIndex)
        ),
        sub(index, animatedIndex)
      )
    )
  );
  return offset;
}

function useInterpolation(
  pageInterpolation: iPageInterpolation,
  animatedNumberOfScreens: Animated.Node<number>,
  index?: number
) {
  const _index = index !== undefined ? index : useIndex();
  const offset = useOffset(_index, animatedNumberOfScreens);
  const styles = memoize(
    interpolateWithConfig(offset, animatedNumberOfScreens, pageInterpolation)
  );
  return styles;
}

function interpolateWithConfig(
  offset: Animated.Node<number>,
  animatedNumberOfScreens: Animated.Node<number>,
  pageInterpolation?: iPageInterpolation
): ViewStyle {
  if (!pageInterpolation) {
    return {};
  }

  return Object.keys(pageInterpolation).reduce((styles: any, key: any) => {
    const currentStyle = pageInterpolation[key];

    if (Array.isArray(currentStyle)) {
      const _style = currentStyle.map((interpolationConfig: any) =>
        interpolateWithConfig(
          offset,
          animatedNumberOfScreens,
          interpolationConfig
        )
      );

      styles[key] = _style;
      return styles;
    }

    if (typeof currentStyle === 'object') {
      let _style;
      const { unit, ...rest } = currentStyle;
      if (currentStyle.unit) {
        _style = concat(interpolate(offset, rest), currentStyle.unit);
      } else {
        _style = interpolate(offset, currentStyle);
      }

      styles[key] = _style;
      return styles;
    }

    if (typeof currentStyle === 'function') {
      const _style = currentStyle(offset);
      styles[key] = _style;
      return styles;
    }

    return styles;
  }, {});
}

function memoize(value: any): any {
  const ref = React.useRef(value);
  return ref.current;
}

const DEFAULT_SPRING_CONFIG = {
  stiffness: 1000,
  damping: 500,
  mass: 3,
  overshootClamping: false,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 0.01,
};

function runSpring(
  clock: Animated.Clock,
  position: Animated.Value<number>,
  toValue: Animated.Node<number>,
  numPages: Animated.Node<number>,
  springConfig?: Partial<SpringConfig>,
  onEnd?: () => Animated.Node<any>
) {
  const state = {
    finished: new Value(0),
    velocity: new Value(0),
    position: position,
    time: new Value(0),
  };

  const config = {
    ...DEFAULT_SPRING_CONFIG,
    ...springConfig,
    toValue: new Value(0),
  };

  const calcToValue = proc((position, toValue, numPages) =>
    block([
      cond(
        and(eq(toValue, 0), greaterOrEq(position, sub(numPages, 1))),
        numPages,
        toValue
      ),
    ])
  );

  const adjToValue = new Value(0);
  const prev = new Value(-1);

  const updateActiveValue = () =>
    cond(neq(prev, config.toValue), [set(prev, toValue), onEnd?.()]);

  return block([
    set(adjToValue, calcToValue(position, toValue, numPages)),
    cond(
      clockRunning(clock),
      0, // this never happens because we stop the clock when the user starts swiping
      [
        set(state.finished, 0),
        set(state.time, 0),
        set(state.velocity, 0),
        updateActiveValue(),
        set(config.toValue, adjToValue),
        startClock(clock),
      ]
    ),
    spring(clock, state, config),
    cond(state.finished, [
      stopClock(clock),
      set(toValue as any, modulo(toValue, numPages)),
      set(state.position, toValue),
      updateActiveValue(),
    ]),
    state.position,
  ]);
}

// a % b but handles negatives
const moduloJs = (a, b) => ((a % b) + b) % b;

export {
  Pager,
  PagerProvider,
  PagerContext,
  usePager,
  useOffset,
  useIndex,
  useAnimatedIndex,
  useInterpolation,
};
