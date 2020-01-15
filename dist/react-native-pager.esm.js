import React, {
  useContext,
  Children,
  useState,
  useEffect,
  createContext,
  useRef,
} from 'react';
import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { State, PanGestureHandler } from 'react-native-gesture-handler';

function _extends() {
  _extends =
    Object.assign ||
    function(target) {
      for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i];

        for (var key in source) {
          if (Object.prototype.hasOwnProperty.call(source, key)) {
            target[key] = source[key];
          }
        }
      }

      return target;
    };

  return _extends.apply(this, arguments);
}

function _objectWithoutPropertiesLoose(source, excluded) {
  if (source == null) return {};
  var target = {};
  var sourceKeys = Object.keys(source);
  var key, i;

  for (i = 0; i < sourceKeys.length; i++) {
    key = sourceKeys[i];
    if (excluded.indexOf(key) >= 0) continue;
    target[key] = source[key];
  }

  return target;
}

var Extrapolate;

(function(Extrapolate) {
  Extrapolate['EXTEND'] = 'extend';
  Extrapolate['CLAMP'] = 'clamp';
  Extrapolate['IDENTITY'] = 'identity';
})(Extrapolate || (Extrapolate = {}));

var VERTICAL = 1;
var HORIZONTAL = 2;
var UNSET = -1;
var TRUE = 1;
var FALSE = 0;
var event = Animated.event,
  defined = Animated.defined,
  block = Animated.block,
  Value = Animated.Value,
  divide = Animated.divide,
  cond = Animated.cond,
  eq = Animated.eq,
  add = Animated.add,
  stopClock = Animated.stopClock,
  Clock = Animated.Clock,
  set = Animated.set,
  clockRunning = Animated.clockRunning,
  multiply = Animated.multiply,
  sub = Animated.sub,
  call = Animated.call,
  max = Animated.max,
  min = Animated.min,
  greaterThan = Animated.greaterThan,
  abs = Animated.abs,
  ceil = Animated.ceil,
  interpolate = Animated.interpolate,
  concat = Animated.concat,
  neq = Animated.neq,
  and = Animated.and,
  startClock = Animated.startClock,
  spring = Animated.spring,
  debug = Animated.debug;
var REALLY_BIG_NUMBER = 1000000000; // at its core, this component converts an activeIndex integer value to an Animated.Value
// this animated value represents all intermediate values of a pager, e.g when a user is dragging, the index
// value might be anything between 1 -> 2 as they are moving. when a gesture is completed, it figures out
// the next activeIndex, snaps to it and passes it back. it also handles snapping to different indices when the activeIndex
// prop changes.
// all styles and positioning of child screens can be computed from this one value, based on a childs index and
// any style config props passed to the Pager.
// pretty much all other props passed to the Pager are configurations for different behaviours of what is described above

function Pager(_ref) {
  var _ref4, _style2;

  var onChange = _ref.onChange,
    _ref$initialIndex = _ref.initialIndex,
    initialIndex = _ref$initialIndex === void 0 ? 0 : _ref$initialIndex,
    children = _ref.children,
    springConfig = _ref.springConfig,
    _ref$panProps = _ref.panProps,
    panProps = _ref$panProps === void 0 ? {} : _ref$panProps,
    _ref$pageSize = _ref.pageSize,
    pageSize = _ref$pageSize === void 0 ? 1 : _ref$pageSize,
    _ref$threshold = _ref.threshold,
    threshold = _ref$threshold === void 0 ? 0.1 : _ref$threshold,
    _ref$minIndex = _ref.minIndex,
    minIndex = _ref$minIndex === void 0 ? 0 : _ref$minIndex,
    parentMax = _ref.maxIndex,
    _ref$adjacentChildOff = _ref.adjacentChildOffset,
    adjacentChildOffset =
      _ref$adjacentChildOff === void 0 ? 10 : _ref$adjacentChildOff,
    style = _ref.style,
    containerStyle = _ref.containerStyle,
    _ref$type = _ref.type,
    type = _ref$type === void 0 ? 'horizontal' : _ref$type,
    pageInterpolation = _ref.pageInterpolation,
    _ref$clamp = _ref.clamp,
    clamp = _ref$clamp === void 0 ? {} : _ref$clamp,
    _ref$clampDrag = _ref.clampDrag,
    clampDrag = _ref$clampDrag === void 0 ? {} : _ref$clampDrag;

  var _useContext = useContext(PagerContext),
    animatedValue = _useContext.animatedValue,
    animatedIndex = _useContext.animatedIndex,
    nextIndex = _useContext.nextIndex;

  var numberOfScreens = Children.count(children);
  var maxIndex =
    parentMax === undefined
      ? Math.ceil((numberOfScreens - 1) / pageSize)
      : parentMax;
  var dragX = memoize(new Value(0));
  var dragY = memoize(new Value(0));
  var gestureState = memoize(new Value(0));
  var handleGesture = memoize(
    event(
      [
        {
          nativeEvent: {
            translationX: dragX,
            translationY: dragY,
          },
        },
      ],
      {
        useNativeDriver: true,
      }
    )
  );
  var handleStateChange = memoize(
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
  var initialWidth = UNSET;

  if (style && style.width) {
    if (typeof style.width === 'number') {
      initialWidth = style.width;
    }
  }

  var initialHeight = UNSET;

  if (style && style.height) {
    if (typeof style.height === 'number') {
      initialHeight = style.height;
    }
  }

  var _useState = useState(initialWidth),
    width = _useState[0],
    setWidth = _useState[1];

  var _useState2 = useState(initialHeight),
    height = _useState2[0],
    setHeight = _useState2[1]; // assign references based on vertical / horizontal configurations

  var dimension = memoize(new Value(0));
  var targetDimension = type === 'vertical' ? 'height' : 'width';
  var targetTransform = type === 'vertical' ? 'translateY' : 'translateX';
  var delta = type === 'vertical' ? dragY : dragX;
  var layoutDimension = type === 'vertical' ? height : width; // `totalDimension` on the container view is required for android layouts to work properly
  // otherwise translations move the panHandler off of the screen
  // set the total width of the container view to the sum width of all the screens

  var totalDimension = multiply(dimension, numberOfScreens);

  function handleLayout(_ref2) {
    var layout = _ref2.nativeEvent.layout;
    layout.width !== width && setWidth(layout.width);
    layout.height !== height && setHeight(layout.height);
  }

  var TYPE = type === 'vertical' ? VERTICAL : HORIZONTAL; // props that might change over time should be reactive:

  var animatedThreshold = useAnimatedValue(threshold);
  var clampDragPrev = useAnimatedValue(clampDrag.prev, REALLY_BIG_NUMBER);
  var clampDragNext = useAnimatedValue(clampDrag.next, REALLY_BIG_NUMBER);
  var animatedMaxIndex = useAnimatedValue(maxIndex);
  var animatedMinIndex = useAnimatedValue(minIndex); // pan event values to track

  var dragStart = memoize(new Value(0));
  var swiping = memoize(new Value(FALSE));

  var _animatedActiveIndex = memoize(new Value(initialIndex));

  var change = memoize(sub(_animatedActiveIndex, animatedValue));
  var absChange = memoize(abs(change));
  var shouldTransition = memoize(greaterThan(absChange, animatedThreshold));
  var indexChange = memoize(new Value(0)); // clamp drag values between the configured clamp props
  // e.g prev => 0.5, next => 0.5 means change can only be between [-0.5, 0.5]
  // minMax order is reversed because next is negative in translation values

  var clampedDelta = memoize(
    min(
      max(divide(delta, dimension), multiply(clampDragNext, -1)),
      clampDragPrev
    )
  );
  var clock = memoize(new Clock()); // snap focus to activeIndex when it updates

  /*
  useEffect(() => {
    if (activeIndex >= minIndex && activeIndex <= maxIndex) {
      nextIndex.setValue(activeIndex);
    }
  }, [activeIndex, minIndex, maxIndex]);
  */
  // animatedIndex represents pager position with an animated value
  // this value is used to compute the transformations of the container screen
  // its also used to compute the offsets of child screens, and any other consumers

  var _animatedValue = memoize(
    block([
      cond(
        eq(gestureState, State.ACTIVE),
        [
          cond(clockRunning(clock), stopClock(clock)), // captures the initial drag value on first drag event
          cond(swiping, 0, [set(dragStart, animatedValue), set(swiping, TRUE)]),
          set(animatedValue, sub(dragStart, clampedDelta)),
        ],
        [
          // on release -- figure out if the index needs to change, and what index it should change to
          cond(swiping, [
            set(swiping, FALSE),
            cond(shouldTransition, [
              // rounds index change if pan gesture greater than just one screen
              set(indexChange, ceil(absChange)), // nextIndex set to the next snap point
              set(
                nextIndex,
                cond(
                  greaterThan(change, 0),
                  min(
                    max(
                      sub(_animatedActiveIndex, indexChange),
                      animatedMinIndex
                    ),
                    animatedMaxIndex
                  ),
                  min(
                    max(
                      add(_animatedActiveIndex, indexChange),
                      animatedMinIndex
                    ),
                    animatedMaxIndex
                  )
                )
              ), // update w/ value that will be snapped to
              cond(
                defined(onChange),
                call([nextIndex], function(_ref3) {
                  var nextIndex = _ref3[0];
                  return onChange == null ? void 0 : onChange(nextIndex);
                })
              ),
            ]),
          ]), // set animatedActiveIndex for next swipe event
          set(_animatedActiveIndex, nextIndex),
          cond(defined(animatedIndex), set(animatedIndex, nextIndex)),
          set(
            animatedValue,
            runSpring(clock, animatedValue, nextIndex, springConfig)
          ),
        ]
      ),
      debug('position', animatedValue),
      cond(defined(animatedValue), set(animatedValue, animatedValue)),
      animatedValue,
    ])
  );

  var clampPrevValue = useAnimatedValue(clamp.prev, numberOfScreens);
  var clampNextValue = useAnimatedValue(clamp.next, numberOfScreens); // stop child screens from translating beyond the bounds set by clamp props:

  var minimum = memoize(
    multiply(sub(_animatedValue, clampPrevValue), dimension)
  );
  var maximum = memoize(
    multiply(add(_animatedValue, clampNextValue), dimension)
  );
  var animatedPageSize = useAnimatedValue(pageSize); // container offset -- this is the window of focus for active screens
  // it shifts around based on the animatedIndex value

  var containerTranslation = memoize(
    multiply(_animatedValue, dimension, animatedPageSize, -1)
  ); // slice the children that are rendered by the <Pager />
  // this enables very large child lists to render efficiently
  // the downside is that children are unmounted after they pass this threshold
  // it's an optional prop, however a default value of ~20 is set here to prevent
  // possible performance bottlenecks to those not aware of the prop or what it does
  // this will slice adjacentChildOffset number of children previous and after
  // the current active child index into a smaller child array

  var adjacentChildren =
    adjacentChildOffset !== undefined
      ? children.slice(
          Math.max(initialIndex - adjacentChildOffset, 0),
          Math.min(initialIndex + adjacentChildOffset + 1, numberOfScreens)
        )
      : children; // grabbing the height property from the style prop if there is no container style, this reduces
  // the chances of messing up the layout with containerStyle configurations
  // can be overridden by the prop itself, but its likely that this is what is intended most of the time
  // also has the benefit of covering 100% width of container, meaning better pan coverage on android

  var defaultContainerStyle =
    style && style.height
      ? {
          height: style.height,
        }
      : undefined;

  function renderChildren() {
    // waiting for initial layout - except when testing
    if (width === UNSET) {
      return null;
    }

    return adjacentChildren.map(function(child, i) {
      // use map instead of React.Children because we want to track
      // the keys of these children by there index
      // React.Children shifts these key values intelligently, but it
      // causes issues with the memoized values in <Page /> components
      var index = i;

      if (adjacentChildOffset !== undefined) {
        index =
          initialIndex <= adjacentChildOffset
            ? i
            : initialIndex - adjacentChildOffset + i;
      }

      return React.createElement(
        Page,
        {
          index: index,
          animatedIndex: _animatedValue,
          minimum: minimum,
          maximum: maximum,
          dimension: dimension,
          targetTransform: targetTransform,
          targetDimension: targetDimension,
          pageInterpolation: pageInterpolation,
        },
        child
      );
    });
  } // extra Animated.Views below may seem redundant but they preserve applied styles e.g padding and margin
  // of the page views

  return React.createElement(
    Animated.View,
    {
      style: containerStyle ||
        defaultContainerStyle || {
          flex: 1,
        },
    },
    React.createElement(Animated.Code, {
      key: layoutDimension,
      exec: cond(
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
      ),
    }),
    React.createElement(
      PanGestureHandler,
      Object.assign({}, panProps, {
        onGestureEvent: handleGesture,
        onHandlerStateChange: handleStateChange,
      }),
      React.createElement(
        Animated.View,
        {
          style: {
            flex: 1,
          },
        },
        React.createElement(
          Animated.View,
          {
            style: style || {
              flex: 1,
            },
          },
          React.createElement(
            Animated.View,
            {
              style: {
                flex: 1,
              },
              onLayout: handleLayout,
            },
            React.createElement(
              Animated.View,
              {
                style:
                  ((_style2 = {
                    flex: 1,
                  }),
                  (_style2[targetDimension] = totalDimension),
                  (_style2.transform = [
                    ((_ref4 = {}),
                    (_ref4[targetTransform] = containerTranslation),
                    _ref4),
                  ]),
                  _style2),
              },
              renderChildren()
            )
          )
        )
      )
    )
  );
}

function Page(_ref5) {
  var _ref6, _memoize;

  var children = _ref5.children,
    index = _ref5.index,
    minimum = _ref5.minimum,
    maximum = _ref5.maximum,
    dimension = _ref5.dimension,
    targetTransform = _ref5.targetTransform,
    targetDimension = _ref5.targetDimension,
    pageInterpolation = _ref5.pageInterpolation,
    animatedIndex = _ref5.animatedIndex;
  // compute the absolute position of the page based on index and dimension
  // this means that it's not relative to any other child, which is good because
  // it doesn't rely on a mechanism like flex, which requires all children to be present
  // to properly position pages
  var position = memoize(multiply(index, dimension)); // min-max the position based on clamp values
  // this means the <Page /> will have a container that is always positioned
  // in the same place, but the inner view can be translated within these bounds

  var translation = memoize(min(max(position, minimum), maximum));
  var defaultStyle = memoize(
    ((_memoize = {}),
    (_memoize[targetDimension] = dimension),
    (_memoize.transform = [
      ((_ref6 = {}), (_ref6[targetTransform] = translation), _ref6),
    ]),
    _memoize)
  ); // compute the relative offset value to the current animated index so
  // that <Page /> can use interpolation values that are in sync with drag gestures

  var offset = memoize(sub(index, animatedIndex)); // apply interpolation configs to <Page />

  var interpolatedStyles = memoize(
    interpolateWithConfig(offset, pageInterpolation)
  ); // take out zIndex here as it needs to be applied to siblings

  var zIndex = interpolatedStyles.zIndex,
    otherStyles = _objectWithoutPropertiesLoose(interpolatedStyles, ['zIndex']); // zIndex is not a requirement of interpolation
  // it will be clear when someone needs it as views will overlap with some configurations

  if (!zIndex) {
    zIndex = 0;
  }

  return React.createElement(
    Animated.View,
    {
      style: _extends({}, StyleSheet.absoluteFillObject, {}, defaultStyle, {
        zIndex: zIndex,
      }),
    },
    React.createElement(
      Animated.View,
      {
        style: [StyleSheet.absoluteFillObject, otherStyles],
      },
      children
    )
  );
} // utility to update animated values without changing their reference
// this is key for using memoized Animated.Values and prevents costly rerenders

function useAnimatedValue(value, defaultValue) {
  if (defaultValue === void 0) {
    defaultValue = 0;
  }

  var initialValue = value !== undefined ? value : defaultValue;
  var animatedValue = memoize(new Value(initialValue));
  useEffect(
    function() {
      if (value !== undefined) {
        animatedValue.setValue(value);
      }
    },
    [value]
  );
  return animatedValue;
}

var PagerContext =
  /*#__PURE__*/
  createContext({
    animatedValue:
      /*#__PURE__*/
      new Value(0),
    animatedIndex:
      /*#__PURE__*/
      new Value(0),
    nextIndex:
      /*#__PURE__*/
      new Value(0),
  });

var PagerProvider = function PagerProvider(_ref7) {
  var children = _ref7.children,
    _ref7$initialIndex = _ref7.initialIndex,
    initialIndex = _ref7$initialIndex === void 0 ? 0 : _ref7$initialIndex;
  var animatedValue = memoize(new Value(initialIndex));
  var animatedIndex = memoize(new Value(initialIndex));
  var nextIndex = memoize(new Value(initialIndex));
  return React.createElement(
    PagerContext.Provider,
    {
      value: {
        animatedValue: animatedValue,
        animatedIndex: animatedIndex,
        nextIndex: nextIndex,
      },
    },
    typeof children === 'function'
      ? children({
          animatedValue: animatedValue,
          animatedIndex: animatedIndex,
          nextIndex: nextIndex,
        })
      : children
  );
};

function usePager() {
  var context = useContext(PagerContext);

  if (context === undefined) {
    throw new Error('usePager() must be used within a <PagerProvider />');
  }

  return context;
}

var IndexContext =
  /*#__PURE__*/
  React.createContext(undefined);

function useIndex() {
  var index = useContext(IndexContext);

  if (index === undefined) {
    throw new Error('useIndex() must be used within an <IndexProvider />');
  }

  return index;
}

function useAnimatedIndex() {
  var pager = usePager();
  return pager[2];
}

function useOffset(index) {
  var animatedIndex = useAnimatedIndex();
  var offset = memoize(sub(index, animatedIndex));
  return offset;
}

function useInterpolation(pageInterpolation, index) {
  var _index = index !== undefined ? index : useIndex();

  var offset = useOffset(_index);
  var styles = memoize(interpolateWithConfig(offset, pageInterpolation));
  return styles;
}

function interpolateWithConfig(offset, pageInterpolation) {
  if (!pageInterpolation) {
    return {};
  }

  return Object.keys(pageInterpolation).reduce(function(styles, key) {
    var currentStyle = pageInterpolation[key];

    if (Array.isArray(currentStyle)) {
      var _style = currentStyle.map(function(interpolationConfig) {
        return interpolateWithConfig(offset, interpolationConfig);
      });

      styles[key] = _style;
      return styles;
    }

    if (typeof currentStyle === 'object') {
      var _style3;

      var unit = currentStyle.unit,
        rest = _objectWithoutPropertiesLoose(currentStyle, ['unit']);

      if (currentStyle.unit) {
        _style3 = concat(interpolate(offset, rest), currentStyle.unit);
      } else {
        _style3 = interpolate(offset, currentStyle);
      }

      styles[key] = _style3;
      return styles;
    }

    if (typeof currentStyle === 'function') {
      var _style4 = currentStyle(offset);

      styles[key] = _style4;
      return styles;
    }

    return styles;
  }, {});
}

function memoize(value) {
  var ref = React.useRef(value);
  return ref.current;
}

var DEFAULT_SPRING_CONFIG = {
  stiffness: 1000,
  damping: 500,
  mass: 3,
  overshootClamping: false,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 0.01,
};

function runSpring(clock, position, toValue, springConfig) {
  var state = {
    finished: new Value(0),
    velocity: new Value(0),
    position: position,
    time: new Value(0),
  };

  var config = _extends({}, DEFAULT_SPRING_CONFIG, {}, springConfig, {
    toValue: new Value(0),
  });

  return block([
    cond(
      clockRunning(clock),
      [
        cond(neq(config.toValue, toValue), [
          set(state.finished, 0),
          set(config.toValue, toValue),
        ]),
      ],
      [
        set(state.finished, 0),
        set(state.time, 0),
        set(state.velocity, 0),
        set(config.toValue, toValue),
        startClock(clock),
      ]
    ),
    spring(clock, state, config),
    cond(state.finished, [stopClock(clock), set(state.position, position)]),
    state.position,
  ]);
}

var interpolate$1 = Animated.interpolate,
  concat$1 = Animated.concat,
  Value$1 = Animated.Value,
  clockRunning$1 = Animated.clockRunning,
  cond$1 = Animated.cond,
  neq$1 = Animated.neq,
  set$1 = Animated.set,
  startClock$1 = Animated.startClock,
  spring$1 = Animated.spring,
  stopClock$1 = Animated.stopClock,
  block$1 = Animated.block;

function interpolateWithConfig$1(offset, pageInterpolation) {
  if (!pageInterpolation) {
    return {};
  }

  return Object.keys(pageInterpolation).reduce(function(styles, key) {
    var currentStyle = pageInterpolation[key];

    if (Array.isArray(currentStyle)) {
      var _style = currentStyle.map(function(interpolationConfig) {
        return interpolateWithConfig$1(offset, interpolationConfig);
      });

      styles[key] = _style;
      return styles;
    }

    if (typeof currentStyle === 'object') {
      var _style2;

      var unit = currentStyle.unit,
        rest = _objectWithoutPropertiesLoose(currentStyle, ['unit']);

      if (currentStyle.unit) {
        _style2 = concat$1(interpolate$1(offset, rest), currentStyle.unit);
      } else {
        _style2 = interpolate$1(offset, currentStyle);
      }

      styles[key] = _style2;
      return styles;
    }

    if (typeof currentStyle === 'function') {
      var _style3 = currentStyle(offset);

      styles[key] = _style3;
      return styles;
    }

    return styles;
  }, {});
}

function memoize$1(value) {
  var ref = useRef(value);
  return ref.current;
}

var Value$2 = Animated.Value,
  divide$1 = Animated.divide,
  multiply$1 = Animated.multiply,
  add$1 = Animated.add;
var DEFAULT_PAGINATION_STYLE = {
  height: 50,
  width: '100%',
  flexDirection: 'row',
};

function Pagination(_ref) {
  var children = _ref.children,
    pageInterpolation = _ref.pageInterpolation,
    style = _ref.style;
  return React.createElement(
    Animated.View,
    {
      style: _extends({}, DEFAULT_PAGINATION_STYLE, {}, style),
    },
    Children.map(children, function(child, index) {
      return React.createElement(
        PaginationItem,
        {
          index: index,
          pageInterpolation: pageInterpolation,
          style: child.props.style,
        },
        child
      );
    })
  );
}

function PaginationItem(_ref2) {
  var children = _ref2.children,
    pageInterpolation = _ref2.pageInterpolation,
    index = _ref2.index,
    style = _ref2.style;
  var offset = useOffset(index);
  var configStyles = memoize$1(
    interpolateWithConfig$1(offset, pageInterpolation)
  );
  return React.createElement(
    Animated.View,
    {
      style: [
        style || {
          flex: 1,
        },
        configStyles,
      ],
    },
    children
  );
}

var DEFAULT_SLIDER_STYLE = {
  height: 2,
  backgroundColor: 'aquamarine',
};

function Slider(_ref3) {
  var numberOfScreens = _ref3.numberOfScreens,
    style = _ref3.style;
  var animatedIndex = useAnimatedIndex();
  var width = memoize$1(new Value$2(0));

  function handleLayout(_ref4) {
    var layout = _ref4.nativeEvent.layout;
    width.setValue(layout.width);
  }

  var sliderWidth = divide$1(width, numberOfScreens);
  var translation = memoize$1(multiply$1(animatedIndex, sliderWidth));
  return React.createElement(
    Animated.View,
    {
      onLayout: handleLayout,
    },
    React.createElement(Animated.View, {
      style: _extends(
        {
          width: sliderWidth,
          transform: [
            {
              translateX: translation,
            },
          ],
        },
        DEFAULT_SLIDER_STYLE,
        {},
        style
      ),
    })
  );
}

function Progress(_ref5) {
  var numberOfScreens = _ref5.numberOfScreens,
    style = _ref5.style;
  var animatedIndex = useAnimatedIndex();
  var width = memoize$1(new Value$2(0));

  function handleLayout(_ref6) {
    var layout = _ref6.nativeEvent.layout;
    width.setValue(layout.width);
  }

  var sliderWidth = memoize$1(
    divide$1(width, numberOfScreens, divide$1(1, add$1(animatedIndex, 1)))
  );
  return React.createElement(
    Animated.View,
    {
      onLayout: handleLayout,
    },
    React.createElement(Animated.View, {
      style: _extends(
        {
          width: sliderWidth,
          height: 2,
          backgroundColor: 'rebeccapurple',
        },
        DEFAULT_SLIDER_STYLE,
        {},
        style
      ),
    })
  );
}

export {
  Extrapolate,
  Pager,
  PagerContext,
  PagerProvider,
  Pagination,
  Progress,
  Slider,
  interpolateWithConfig$1 as interpolateWithConfig,
  useAnimatedIndex,
  useIndex,
  useInterpolation,
  useOffset,
  usePager,
};
//# sourceMappingURL=react-native-pager.esm.js.map
