import React from "react";
import Svg, { Path, Circle } from "react-native-svg";

type Props = {
  type?: string;
  color?: string;
  size?: number;
};

export function VehicleSvg({ type, color = "#333", size = 80 }: Props) {
  const strokeColor = color.toLowerCase() || "#333";

  if (type === "MOTORCYCLE") {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M18 14L17 11M3 9L9 11C9 10.4696 9.21071 9.96086 9.58579 9.58579C9.96086 9.21071 10.4696 9 11 9H13C13.4974 9.00024 13.9768 9.18579 14.3448 9.52046C14.7127 9.85512 14.9427 10.3149 14.99 10.81M8 17H11C11.2652 17 11.5196 16.8946 11.7071 16.7071C11.8946 16.5196 12 16.2652 12 16C12 14.4087 12.6321 12.8826 13.7574 11.7574C14.8826 10.6321 16.4087 10 18 10C18.2652 10 18.5196 9.89464 18.7071 9.70711C18.8946 9.51957 19 9.26522 19 9V8.25C18.7892 6.94486 18.0701 5.77632 17 5"
          stroke={strokeColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Circle cx={5} cy={17} r={3} stroke={strokeColor} strokeWidth={2} />
        <Circle cx={19} cy={17} r={3} stroke={strokeColor} strokeWidth={2} />
      </Svg>
    );
  }

  // Car / SUV
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 17H21C21.6 17 22 16.6 22 16V13C22 12.1 21.3 11.3 20.5 11.1C18.7 10.6 16 10 16 10C16 10 14.7 8.6 13.8 7.7C13.3 7.3 12.7 7 12 7H5C4.4 7 3.9 7.4 3.6 7.9L2.2 10.8C2.06758 11.1862 2 11.5917 2 12V16C2 16.6 2.4 17 3 17H5M19 17C19 18.1046 18.1046 19 17 19C15.8954 19 15 18.1046 15 17M19 17C19 15.8954 18.1046 15 17 15C15.8954 15 15 15.8954 15 17M5 17C5 18.1046 5.89543 19 7 19C8.10457 19 9 18.1046 9 17M5 17C5 15.8954 5.89543 15 7 15C8.10457 15 9 15.8954 9 17M9 17H15"
        stroke={strokeColor}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
