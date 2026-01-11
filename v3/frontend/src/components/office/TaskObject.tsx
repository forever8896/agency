// 3D Task Object - floating ticket card

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { Group } from 'three';
import type { Task } from '../../types';
import { PRIORITY_COLORS } from './constants';

interface TaskObjectProps {
  task: Task;
  position: [number, number, number];
  selected?: boolean;
  onClick?: () => void;
  draggable?: boolean;
}

export function TaskObject({ task, position, selected, onClick }: TaskObjectProps) {
  const groupRef = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);
  const color = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.P2;

  // Gentle floating animation
  useFrame((state) => {
    if (!groupRef.current) return;
    const time = state.clock.elapsedTime;
    groupRef.current.position.y = position[1] + Math.sin(time * 2 + position[0]) * 0.03;
    groupRef.current.rotation.y = Math.sin(time * 0.5 + position[2]) * 0.05;
  });

  return (
    <group
      ref={groupRef}
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Selection/hover highlight */}
      {(selected || hovered) && (
        <mesh position={[0, 0, -0.04]}>
          <boxGeometry args={[0.65, 0.45, 0.01]} />
          <meshBasicMaterial
            color={selected ? '#60a5fa' : '#ffffff'}
            transparent
            opacity={0.3}
          />
        </mesh>
      )}

      {/* Card base */}
      <mesh castShadow>
        <boxGeometry args={[0.55, 0.35, 0.03]} />
        <meshStandardMaterial color="#1a1a24" />
      </mesh>

      {/* Priority stripe on left edge */}
      <mesh position={[-0.24, 0, 0.02]}>
        <boxGeometry args={[0.04, 0.3, 0.02]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} />
      </mesh>

      {/* Size indicator dots */}
      <SizeDots size={task.size} />

      {/* Glow effect for high priority */}
      {(task.priority === 'P0' || task.priority === 'P1') && (
        <pointLight
          position={[0, 0, 0.1]}
          color={color}
          intensity={0.15}
          distance={0.8}
        />
      )}

      {/* Hover tooltip */}
      {hovered && (
        <Html
          position={[0, 0.35, 0]}
          center
          style={{ pointerEvents: 'none' }}
        >
          <div
            className="px-2 py-1 rounded text-xs max-w-48 text-center"
            style={{
              backgroundColor: 'rgba(10, 10, 15, 0.95)',
              border: `1px solid ${color}`,
              color: '#f0f0f5',
            }}
          >
            <div className="font-medium truncate">{task.title}</div>
            <div className="text-gray-400 text-[10px] mt-0.5">
              {task.priority} / {task.size} / {task.status}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

function SizeDots({ size }: { size: string }) {
  const count = { S: 1, M: 2, L: 3, XL: 4 }[size] || 2;

  return (
    <group position={[0.18, -0.1, 0.02]}>
      {Array.from({ length: count }).map((_, i) => (
        <mesh key={i} position={[0, i * 0.06, 0]}>
          <sphereGeometry args={[0.015, 8, 8]} />
          <meshStandardMaterial color="#6b7280" />
        </mesh>
      ))}
    </group>
  );
}
