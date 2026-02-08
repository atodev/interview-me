import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface SineWaveProps {
  /** Audio volume level, 0 (silent) to 1 (loud) */
  volume: number;
  /** Wave color (default green) */
  color?: string;
  /** Height of the visualization */
  height?: number;
}

function generateWavePath(
  width: number,
  height: number,
  amplitude: number,
  frequency: number,
  phase: number,
): string {
  const centerY = height / 2;
  const parts: string[] = [];
  for (let x = 0; x <= width; x += 3) {
    const y = centerY + amplitude * Math.sin((x / width) * Math.PI * 2 * frequency + phase);
    parts.push(`${x === 0 ? 'M' : 'L'} ${x} ${y.toFixed(1)}`);
  }
  return parts.join(' ');
}

export default function SineWave({ volume, color = '#10B981', height = 80 }: SineWaveProps) {
  const { width } = useWindowDimensions();
  const phaseRef = useRef(0);
  const [paths, setPaths] = useState<string[]>([]);
  const frameRef = useRef<number>(0);
  const smoothVolume = useRef(0);

  useEffect(() => {
    let running = true;

    const tick = () => {
      if (!running) return;

      // Smooth the volume for less jittery animation
      smoothVolume.current += (volume - smoothVolume.current) * 0.15;
      const v = smoothVolume.current;

      phaseRef.current += 0.08;
      const phase = phaseRef.current;

      // Base amplitude + volume-driven amplitude
      const baseAmp = 3;
      const maxAmp = (height / 2) - 4;
      const amp = baseAmp + v * (maxAmp - baseAmp);

      // Generate 3 overlapping waves at different frequencies
      const wave1 = generateWavePath(width, height, amp, 2.5, phase);
      const wave2 = generateWavePath(width, height, amp * 0.6, 3.5, phase + 1.2);
      const wave3 = generateWavePath(width, height, amp * 0.35, 5, phase + 2.5);

      setPaths([wave1, wave2, wave3]);
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(frameRef.current);
    };
  }, [volume, width, height]);

  return (
    <View style={[styles.container, { height }]}>
      <Svg width={width} height={height}>
        {paths[2] && (
          <Path d={paths[2]} stroke={color} strokeWidth={1.5} fill="none" opacity={0.2} />
        )}
        {paths[1] && (
          <Path d={paths[1]} stroke={color} strokeWidth={2} fill="none" opacity={0.4} />
        )}
        {paths[0] && (
          <Path d={paths[0]} stroke={color} strokeWidth={2.5} fill="none" opacity={0.8} />
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
  },
});
