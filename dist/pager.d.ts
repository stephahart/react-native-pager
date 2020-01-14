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
  activeIndex?: number;
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
  animatedValue?: Animated.Value<number>;
  animatedIndex?: Animated.Value<number>;
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
  activeIndex: parentActiveIndex,
  onChange: parentOnChange,
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
  animatedValue,
}: iPager): JSX.Element;
declare type iPagerContext = [
  number,
  (nextIndex: number) => void,
  Animated.Value<number>
];
declare const PagerContext: React.Context<iPagerContext | undefined>;
interface iPagerProvider {
  children: React.ReactNode;
  initialIndex?: number;
  activeIndex?: number;
  onChange?: (nextIndex: number) => void;
}
declare function PagerProvider({
  children,
  initialIndex,
  activeIndex: parentActiveIndex,
  onChange: parentOnChange,
}: iPagerProvider): JSX.Element;
declare function usePager(): iPagerContext;
interface iFocusProvider {
  children: React.ReactNode;
  focused: boolean;
}
declare function FocusProvider({
  focused,
  children,
}: iFocusProvider): JSX.Element;
declare function useFocus(): boolean;
interface iIndexProvider {
  children: React.ReactNode;
  index: number;
}
declare function IndexProvider({
  children,
  index,
}: iIndexProvider): JSX.Element;
declare function useIndex(): number;
declare function useOnFocus(fn: Function): void;
declare function useAnimatedIndex(): Animated.Value<number>;
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
  useFocus,
  useOffset,
  useOnFocus,
  useIndex,
  useAnimatedIndex,
  useInterpolation,
  IndexProvider,
  FocusProvider,
};
