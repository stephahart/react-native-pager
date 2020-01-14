import React from 'react';
import { ViewStyle } from 'react-native';
import { iPageInterpolation } from './pager';
interface iPagination {
  children: React.ReactNode;
  pageInterpolation: iPageInterpolation;
  style?: ViewStyle;
}
declare function Pagination({
  children,
  pageInterpolation,
  style,
}: iPagination): JSX.Element;
interface iSlider {
  numberOfScreens: number;
  style: ViewStyle;
}
declare function Slider({ numberOfScreens, style }: iSlider): JSX.Element;
declare function Progress({ numberOfScreens, style }: iSlider): JSX.Element;
export { Pagination, Slider, Progress };
