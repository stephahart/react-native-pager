import React, {useState} from 'react';
import {Pager, iPageInterpolation} from '@crowdlinker/react-native-pager';
import {Slide, NavigationButtons} from './shared-components';
import {View} from 'react-native';
import Animated from 'react-native-reanimated';

const {multiply, floor} = Animated;

const kilterCardsConfig: iPageInterpolation = {
  transform: [
    {
      scale: {
        inputRange: [-1, 0, 1],
        outputRange: [0.95, 1, 0.95],
      },
    },

    {
      translateY: {
        inputRange: [-1, 0, 1, 2],
        outputRange: [0, 0, 10, -15],
      },
    },

    {
      rotate: {
        unit: 'deg',
        inputRange: [-1, 0, 1, 2],
        outputRange: [-20, 0, -7.5, 5],
      },
    },
  ],

  zIndex: (offset: Animated.Node<number>) => multiply(floor(offset), -1),

  opacity: {
    inputRange: [-2, -1, 0, 1, 2, 3, 4],
    outputRange: [0, 0, 1, 1, 1, 0, 0],
  },
};

function KilterCards() {
  const [activeIndex, onChange] = useState(3);

  return (
    <View>
      <Pager
        activeIndex={activeIndex}
        onChange={onChange}
        clamp={{next: 0}}
        threshold={0.3}
        adjacentChildOffset={3}
        style={{height: 200, width: 200, alignSelf: 'center', padding: 10}}
        pageInterpolation={kilterCardsConfig}>
        {Array.from({length: activeIndex + 3}, (_, i) => (
          <Slide key={i} i={i} />
        ))}
      </Pager>
      <NavigationButtons activeIndex={activeIndex} onChange={onChange} />
    </View>
  );
}

export {KilterCards};
