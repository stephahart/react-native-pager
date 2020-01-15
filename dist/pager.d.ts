import React from 'react';
import { ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { PanGestureHandlerProperties } from 'react-native-gesture-handler';
export declare type SpringConfig = {
  damping: Animated.Adaptable<number>;
  mass: Animated.Adaptable<number>;
  stiffness: Animated.Adaptable<number>;
  overshootClamping: Animated.Adaptable<number> | boolean;
  restSpeedThreshold: Animated.Adaptable<number>;
  restDisplacementThreshold: Animated.Adaptable<number>;
  toValue: Animated.Adaptable<number>;
};
export declare enum Extrapolate {
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
declare type iInterpolationFn = (
  offset: Animated.Node<number>
) => Animated.Node<number>;
interface iInterpolationConfig extends InterpolationConfig {
  unit?: string;
}
declare type iTransformProp = {
  [transformProp: string]: iInterpolationConfig | iInterpolationFn;
};
export interface iPageInterpolation {
  [animatedProp: string]:
    | iTransformProp[]
    | iInterpolationConfig
    | iInterpolationFn;
}
export interface iPager {
  onChange?: (nextIndex: number) => void;
  initialIndex?: number;
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
}
declare function Pager({
  onChange,
  initialIndex,
  children,
  springConfig,
  panProps,
  pageSize,
  threshold,
  minIndex,
  maxIndex: parentMax,
  adjacentChildOffset,
  style,
  containerStyle,
  type,
  pageInterpolation,
  clamp,
  clampDrag,
}: iPager): JSX.Element;
interface iPagerContext {
  animatedValue: Animated.Value<number>;
  animatedIndex: Animated.Value<number>;
  nextIndex: Animated.Value<number>;
}
declare const PagerContext: React.Context<iPagerContext>;
interface iPagerProvider {
  children: React.ReactNode;
  initialIndex: number;
}
declare const PagerProvider: React.FC<iPagerProvider>;
declare function usePager(): iPagerContext;
declare function useIndex(): number;
declare function useAnimatedIndex(): any;
declare function useOffset(index: number): any;
declare function useInterpolation(
  pageInterpolation: iPageInterpolation,
  index?: number
): any;
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
