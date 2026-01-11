// Office Floor with zones and grid

import { ZONES, FLOOR_SIZE, FLOOR_COLOR, GRID_COLOR } from './constants';

export function OfficeFloor() {
  return (
    <group>
      {/* Main floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[FLOOR_SIZE, FLOOR_SIZE]} />
        <meshStandardMaterial color={FLOOR_COLOR} />
      </mesh>

      {/* Grid lines */}
      <gridHelper
        args={[FLOOR_SIZE, 20, GRID_COLOR, GRID_COLOR]}
        position={[0, 0.01, 0]}
      />

      {/* Zone markers */}
      {ZONES.map((zone) => (
        <group key={zone.id} position={zone.position}>
          {/* Zone floor highlight */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
            <planeGeometry args={zone.size} />
            <meshStandardMaterial
              color={zone.color}
              transparent
              opacity={0.15}
            />
          </mesh>

          {/* Zone border */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
            <ringGeometry args={[
              Math.min(zone.size[0], zone.size[1]) * 0.48,
              Math.min(zone.size[0], zone.size[1]) * 0.5,
              4
            ]} />
            <meshBasicMaterial color={zone.color} transparent opacity={0.3} />
          </mesh>
        </group>
      ))}

      {/* Walls (subtle backdrop) */}
      <mesh position={[0, 2, -FLOOR_SIZE / 2]} receiveShadow>
        <planeGeometry args={[FLOOR_SIZE, 4]} />
        <meshStandardMaterial color="#0f0f14" />
      </mesh>
      <mesh position={[-FLOOR_SIZE / 2, 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[FLOOR_SIZE, 4]} />
        <meshStandardMaterial color="#0d0d12" />
      </mesh>

      {/* Decorative elements */}

      {/* Inbox tray */}
      <group position={[-6, 0, -3]}>
        <mesh position={[0, 0.15, 0]}>
          <boxGeometry args={[0.8, 0.3, 0.6]} />
          <meshStandardMaterial color="#374151" />
        </mesh>
      </group>

      {/* Whiteboard in ready area */}
      <group position={[-4, 0, 0]}>
        <mesh position={[0, 1.2, 0]}>
          <boxGeometry args={[2, 1.2, 0.05]} />
          <meshStandardMaterial color="#f0f0f5" />
        </mesh>
        <mesh position={[0, 1.2, -0.03]}>
          <boxGeometry args={[2.1, 1.3, 0.02]} />
          <meshStandardMaterial color="#374151" />
        </mesh>
      </group>

      {/* Trophy case in done area */}
      <group position={[0, 0, 5.5]}>
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[1.5, 1, 0.4]} />
          <meshStandardMaterial color="#1a1a24" transparent opacity={0.8} />
        </mesh>
      </group>

      {/* Coffee machine */}
      <group position={[7, 0, 0]}>
        <mesh position={[0, 0.4, 0]}>
          <boxGeometry args={[0.3, 0.5, 0.3]} />
          <meshStandardMaterial color="#1a1a24" />
        </mesh>
        <mesh position={[0, 0.7, 0]}>
          <boxGeometry args={[0.25, 0.1, 0.25]} />
          <meshStandardMaterial color="#ef4444" />
        </mesh>
      </group>

      {/* Plants */}
      <Plant position={[-8, 0, -4]} />
      <Plant position={[8, 0, 5]} />
      <Plant position={[-8, 0, 5]} />
    </group>
  );
}

function Plant({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Pot */}
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.15, 0.12, 0.3, 8]} />
        <meshStandardMaterial color="#6b4423" />
      </mesh>
      {/* Plant */}
      <mesh position={[0, 0.45, 0]}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshStandardMaterial color="#22c55e" />
      </mesh>
    </group>
  );
}
