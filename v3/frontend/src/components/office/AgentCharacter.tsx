// 3D Agent Character - geometric humanoid with status-based coloring

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { Mesh, Group } from 'three';
import type { Agent } from '../../types';
import { STATUS_COLORS } from './constants';

interface AgentCharacterProps {
  agent: Agent;
  position: [number, number, number];
  selected?: boolean;
  onClick?: () => void;
}

export function AgentCharacter({ agent, position, selected, onClick }: AgentCharacterProps) {
  const groupRef = useRef<Group>(null);
  const bodyRef = useRef<Mesh>(null);
  const color = STATUS_COLORS[agent.status] || STATUS_COLORS.OFFLINE;

  // Animate based on status
  useFrame((state) => {
    if (!bodyRef.current) return;

    const time = state.clock.elapsedTime;

    if (agent.status === 'IDLE') {
      // Gentle breathing animation
      bodyRef.current.scale.y = 1 + Math.sin(time * 2) * 0.02;
    } else if (agent.status === 'WORKING') {
      // Typing/bobbing animation
      bodyRef.current.position.y = 0.5 + Math.sin(time * 8) * 0.015;
    } else if (agent.status === 'BLOCKED') {
      // Slight shake
      bodyRef.current.position.x = Math.sin(time * 15) * 0.01;
    } else {
      // Reset
      bodyRef.current.scale.y = 1;
      bodyRef.current.position.y = 0.5;
      bodyRef.current.position.x = 0;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Clickable area */}
      <mesh
        position={[0, 0.6, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        visible={false}
      >
        <cylinderGeometry args={[0.4, 0.4, 1.2, 8]} />
      </mesh>

      {/* Selection ring */}
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.45, 0.55, 32]} />
          <meshBasicMaterial color="#60a5fa" transparent opacity={0.8} />
        </mesh>
      )}

      {/* Desk */}
      <mesh position={[0, 0.3, 0.4]}>
        <boxGeometry args={[0.8, 0.05, 0.5]} />
        <meshStandardMaterial color="#2a2a3a" />
      </mesh>

      {/* Chair */}
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[0.35, 0.05, 0.35]} />
        <meshStandardMaterial color="#1a1a24" />
      </mesh>

      {/* Body (capsule-ish with cylinders) */}
      <mesh ref={bodyRef} position={[0, 0.5, 0]}>
        <capsuleGeometry args={[0.12, 0.3, 4, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 0.9, 0]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="#f5e6d3" />
      </mesh>

      {/* Status glow */}
      {agent.status === 'WORKING' && (
        <pointLight position={[0, 0.5, 0]} color={color} intensity={0.3} distance={1.5} />
      )}

      {/* Monitor (when working) */}
      {(agent.status === 'WORKING' || agent.status === 'IDLE') && (
        <mesh position={[0, 0.45, 0.55]}>
          <boxGeometry args={[0.3, 0.2, 0.02]} />
          <meshStandardMaterial
            color={agent.status === 'WORKING' ? '#60a5fa' : '#374151'}
            emissive={agent.status === 'WORKING' ? '#60a5fa' : '#000000'}
            emissiveIntensity={agent.status === 'WORKING' ? 0.3 : 0}
          />
        </mesh>
      )}

      {/* Name tag */}
      <Html
        position={[0, 1.2, 0]}
        center
        style={{
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        <div
          className="px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap"
          style={{
            backgroundColor: 'rgba(10, 10, 15, 0.9)',
            border: `1px solid ${color}`,
            color: '#f0f0f5',
          }}
        >
          {agent.name}
        </div>
      </Html>

      {/* Status icon for special states */}
      {agent.status === 'PAUSED' && (
        <Html position={[0.2, 1.1, 0]} center style={{ pointerEvents: 'none' }}>
          <div className="text-orange-400 text-sm">||</div>
        </Html>
      )}
      {agent.status === 'BLOCKED' && (
        <Html position={[0.2, 1.1, 0]} center style={{ pointerEvents: 'none' }}>
          <div className="text-red-400 text-sm">!</div>
        </Html>
      )}
    </group>
  );
}
