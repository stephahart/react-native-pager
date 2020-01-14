/// <reference types="react" />
declare const colors: string[];
declare function Slide(): JSX.Element;
interface iPagerConsumer {
  activeIndex: number;
  onChange: (nextIndex: number) => void;
  incrementBy?: number;
}
declare function NavigationButtons({
  activeIndex,
  onChange,
  incrementBy,
}: iPagerConsumer): JSX.Element;
export { Slide, NavigationButtons, colors };
