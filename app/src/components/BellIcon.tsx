import React from 'react';
import Svg, { G, Path, Defs, ClipPath, Rect } from 'react-native-svg';

interface BellIconProps {
  size?: number;
  color?: string;
  style?: any;
}

export const BellIcon: React.FC<BellIconProps> = ({ size = 24, color = '#FFFFFF', style }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <G clipPath="url(#clip0_2_9)">
        <Path 
          d="M18 8C18 4.68851 15.3115 2 12 2C8.68851 2 6 4.68851 6 8C6 15 3 17 3 17H21C28 17 18 15 18 8" 
          stroke={color} 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
        <Path 
          d="M13.73 21C13.3722 21.6168 12.7131 21.9965 12 21.9965C11.2869 21.9965 10.6278 21.6168 10.27 21" 
          stroke={color} 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
      </G>
      <Defs>
        <ClipPath id="clip0_2_9">
          <Rect width="1000" height="1000" fill="white" />
        </ClipPath>
      </Defs>
    </Svg>
  );
};
