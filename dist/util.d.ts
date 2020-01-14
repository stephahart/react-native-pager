import { ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { iPageInterpolation, SpringConfig } from './pager';
declare function interpolateWithConfig(
  offset: Animated.Node<number>,
  pageInterpolation?: iPageInterpolation
): ViewStyle;
declare function memoize(value: any): any;
declare function runSpring(
  clock: Animated.Clock,
  position: Animated.Value<number>,
  toValue: Animated.Node<number>,
  springConfig?: Partial<SpringConfig>
): Animated.Node<number>;
export { interpolateWithConfig, memoize, runSpring };
