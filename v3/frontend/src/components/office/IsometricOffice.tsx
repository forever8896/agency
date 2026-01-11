// Isometric Office Scene - Main 3D scene composition

import { useEffect, useRef } from 'react';
import { OrthographicCamera, OrbitControls } from '@react-three/drei';
import type { OrthographicCamera as OrthographicCameraType } from 'three';
import type { Agent, Task } from '../../types';
import { OfficeFloor } from './OfficeFloor';
import { AgentCharacter } from './AgentCharacter';
import { TaskObject } from './TaskObject';
import {
  AGENT_POSITIONS,
  CAMERA_POSITION,
  AMBIENT_LIGHT_INTENSITY,
  DIRECTIONAL_LIGHT_INTENSITY,
  DIRECTIONAL_LIGHT_POSITION,
  INBOX_POSITION,
  READY_POOL_POSITION,
  DONE_POSITION,
} from './constants';

interface IsometricOfficeProps {
  agents: Agent[];
  tasks: Task[];
  selectedAgent: string | null;
  selectedTask: string | null;
  onAgentClick: (agent: Agent) => void;
  onTaskClick: (task: Task) => void;
  onBackgroundClick: () => void;
}

export function IsometricOffice({
  agents,
  tasks,
  selectedAgent,
  selectedTask,
  onAgentClick,
  onTaskClick,
  onBackgroundClick,
}: IsometricOfficeProps) {
  const cameraRef = useRef<OrthographicCameraType>(null);

  useEffect(() => {
    if (cameraRef.current) {
      cameraRef.current.lookAt(0, 0, 0);
      cameraRef.current.updateProjectionMatrix();
    }
  }, []);

  return (
    <>
      {/* Camera */}
      <OrthographicCamera
        ref={cameraRef}
        makeDefault
        position={CAMERA_POSITION}
        zoom={35}
        near={-100}
        far={200}
      />

      {/* Camera controls - pan and zoom only, no rotation */}
      <OrbitControls
        enableRotate={false}
        enablePan={true}
        enableZoom={true}
        minZoom={20}
        maxZoom={80}
        panSpeed={0.8}
        zoomSpeed={0.5}
        target={[0, 0, 0]}
      />

      {/* Lighting */}
      <ambientLight intensity={AMBIENT_LIGHT_INTENSITY} />
      <directionalLight
        position={DIRECTIONAL_LIGHT_POSITION}
        intensity={DIRECTIONAL_LIGHT_INTENSITY}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight
        position={[-10, 10, -10]}
        intensity={0.2}
      />

      {/* Background click handler */}
      <mesh
        position={[0, -0.1, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={onBackgroundClick}
        visible={false}
      >
        <planeGeometry args={[50, 50]} />
      </mesh>

      {/* Office floor and zones */}
      <OfficeFloor />

      {/* Agents */}
      {agents.map((agent) => {
        const position = AGENT_POSITIONS[agent.name];
        if (!position) return null;

        return (
          <AgentCharacter
            key={agent.name}
            agent={agent}
            position={position}
            selected={selectedAgent === agent.name}
            onClick={() => onAgentClick(agent)}
          />
        );
      })}

      {/* Tasks */}
      {tasks.map((task) => {
        const position = calculateTaskPosition(task, tasks, agents);
        return (
          <TaskObject
            key={task.id}
            task={task}
            position={position}
            selected={selectedTask === task.id}
            onClick={() => onTaskClick(task)}
          />
        );
      })}
    </>
  );
}

// Calculate task position based on status and assignment
function calculateTaskPosition(
  task: Task,
  allTasks: Task[],
  _agents: Agent[]
): [number, number, number] {
  // Get tasks with same status for stacking
  const sameStatusTasks = allTasks.filter((t) => t.status === task.status);
  const index = sameStatusTasks.findIndex((t) => t.id === task.id);

  switch (task.status) {
    case 'INBOX': {
      // Stack in inbox tray
      const row = Math.floor(index / 3);
      const col = index % 3;
      return [
        INBOX_POSITION[0] + col * 0.3 - 0.3,
        INBOX_POSITION[1] + row * 0.15,
        INBOX_POSITION[2],
      ];
    }

    case 'READY': {
      // Grid on whiteboard
      const row = Math.floor(index / 4);
      const col = index % 4;
      return [
        READY_POOL_POSITION[0] + col * 0.6 - 0.9,
        READY_POOL_POSITION[1] + 0.8 - row * 0.45,
        READY_POOL_POSITION[2] - 0.1,
      ];
    }

    case 'IN_PROGRESS': {
      // Near assigned agent
      if (task.assigned_to) {
        const agentPos = AGENT_POSITIONS[task.assigned_to];
        if (agentPos) {
          return [agentPos[0] + 0.6, 0.7, agentPos[2]];
        }
      }
      // Fallback to ready area
      return [READY_POOL_POSITION[0] + 2, 0.5, READY_POOL_POSITION[2]];
    }

    case 'QA_TESTING': {
      const qaPos = AGENT_POSITIONS['qa'];
      return [qaPos[0] + 0.6, 0.7, qaPos[2]];
    }

    case 'REVIEWING': {
      const reviewerPos = AGENT_POSITIONS['reviewer'];
      return [reviewerPos[0] + 0.6, 0.7, reviewerPos[2]];
    }

    case 'DONE':
    case 'SHIPPED':
    case 'QA_PASSED':
    case 'REVIEWED': {
      // Trophy case area
      const row = Math.floor(index / 3);
      const col = index % 3;
      return [
        DONE_POSITION[0] + col * 0.5 - 0.5,
        DONE_POSITION[1] + 0.3,
        DONE_POSITION[2] + row * 0.3,
      ];
    }

    default:
      return [0, 0.5, 0];
  }
}
