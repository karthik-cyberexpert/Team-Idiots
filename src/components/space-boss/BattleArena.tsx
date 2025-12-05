import { useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, Text } from "@react-three/drei";
import { Group, Vector3 } from "three";
import { SpaceBattle, SpaceBattleParticipant } from "@/types/space-boss";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { GameModes } from "./GameModes";
import { useSpaceBattle } from "@/hooks/useSpaceBattle";

interface BattleArenaProps {
  battle: SpaceBattle;
  participants: SpaceBattleParticipant[];
  onDamageDealt: (damage: number) => void;
}

function Boss({ hp, maxHp }: { hp: number; maxHp: number }) {
  const meshRef = useRef<Group>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.005;
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  const scale = 1 + (hp / maxHp) * 0.5;

  return (
    <group ref={meshRef}>
      {/* Boss Core */}
      <mesh>
        <dodecahedronGeometry args={[1.5 * scale, 0]} />
        <meshStandardMaterial color="#ff0000" emissive="#550000" wireframe />
      </mesh>
      {/* Boss Shell */}
      <mesh>
        <icosahedronGeometry args={[1.2 * scale, 1]} />
        <meshStandardMaterial color="#330000" transparent opacity={0.8} />
      </mesh>
      {/* HP Text */}
      <Text position={[0, 2.5, 0]} fontSize={0.5} color="red">
        {hp}/{maxHp}
      </Text>
    </group>
  );
}

function PlayerShip({ position, isLocal }: { position: [number, number, number], isLocal: boolean }) {
  const shipRef = useRef<Group>(null);

  useFrame((state) => {
    if (shipRef.current) {
      // Simple orbit animation
      const time = state.clock.elapsedTime;
      const radius = 8;
      const speed = 0.2;
      const offset = position[0]; // Use x pos as offset
      
      shipRef.current.position.x = Math.cos(time * speed + offset) * radius;
      shipRef.current.position.z = Math.sin(time * speed + offset) * radius;
      shipRef.current.lookAt(0, 0, 0);
    }
  });

  return (
    <group ref={shipRef} position={new Vector3(...position)}>
      <mesh rotation={[0, Math.PI, 0]}>
        <coneGeometry args={[0.3, 1, 4]} />
        <meshStandardMaterial color={isLocal ? "#00ff00" : "#0088ff"} />
      </mesh>
    </group>
  );
}

export function BattleArena({ battle: initialBattle, participants: initialParticipants, onDamageDealt }: BattleArenaProps) {
  const { battle, participants, dealDamage } = useSpaceBattle(initialBattle.id, initialBattle);
  
  // Use the hook's battle state instead of local state
  const currentHp = battle.current_hp;

  return (
    <div className="relative w-full h-full flex flex-col md:flex-row">
      {/* 3D Scene */}
      <div className="w-full md:w-1/2 h-[50vh] md:h-full relative bg-black">
        <div className="absolute top-4 left-4 z-10 text-white">
          <h2 className="text-2xl font-bold">{battle.title}</h2>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="border-red-500 text-red-500">
              BOSS HP: {currentHp}
            </Badge>
            <Badge variant="outline" className="border-blue-500 text-blue-500">
              Players: {participants.length}
            </Badge>
          </div>
          <Progress value={(currentHp / battle.base_hp) * 100} className="w-64 mt-2 h-2 bg-red-900" indicatorClassName="bg-red-500" />
        </div>

        <Canvas camera={{ position: [0, 5, 15], fov: 60 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 1.5} minPolarAngle={Math.PI / 3} />
          
          <Boss hp={currentHp} maxHp={battle.base_hp} />
          
          {participants.map((p, i) => (
            <PlayerShip 
              key={p.id} 
              position={[i, 0, 0]} // Simple distribution
              isLocal={false} // In real app, check user ID
            />
          ))}
          
          {/* Local Player Ship (always present for demo) */}
          <PlayerShip position={[Math.PI, 0, 0]} isLocal={true} />

        </Canvas>
      </div>

      {/* Game Interface */}
      <div className="w-full md:w-1/2 h-[50vh] md:h-full bg-background border-l border-border p-4 flex flex-col">
        <Card className="flex-1 flex flex-col overflow-hidden">
          <GameModes 
            mode={battle.mode} 
            onSuccess={(damage) => {
              dealDamage(damage);
              onDamageDealt(damage);
            }} 
          />
        </Card>
      </div>
    </div>
  );
}
