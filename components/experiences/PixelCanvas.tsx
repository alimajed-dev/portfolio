"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { capturePixelEvent } from "@/lib/pixel-monitoring";

type Props = { scene: number; rgb: [number, number, number] };

function WebGLFallback() {
  useEffect(() => capturePixelEvent("webgl_unavailable"), []);
  return <div className="absolute inset-0 bg-[radial-gradient(circle_at_65%_42%,#17213a,#07090f_62%)]" />;
}

const CAMERA_POSITIONS: [number, number, number][] = [
  [0.9, 0.2, 8],
  [1.3, 0, 6.2],
  [1.6, 0, 5.4],
  [1.4, 0, 5.7],
];

function CameraRig({ scene, manualRef }: { scene: number; manualRef: React.MutableRefObject<boolean> }) {
  const camera = useThree((state) => state.camera);
  const desired = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(1.25, 0, 0), []);
  const currentTarget = useRef(new THREE.Vector3());

  useEffect(() => {
    manualRef.current = false;
    const position = CAMERA_POSITIONS[scene];
    desired.set(position[0], position[1], position[2]);
  }, [desired, manualRef, scene]);

  useFrame((_, delta) => {
    if (manualRef.current) return;
    const ease = 1 - Math.exp(-delta * 2.7);
    camera.position.lerp(desired, ease);
    currentTarget.current.lerp(target, ease);
    camera.lookAt(currentTarget.current);
  });
  return null;
}

function MouseOrbit({ manualRef }: { manualRef: React.MutableRefObject<boolean> }) {
  const camera = useThree((state) => state.camera);
  const element = useThree((state) => state.gl.domElement);
  const controlsRef = useRef<OrbitControls | null>(null);

  useEffect(() => {
    const controls = new OrbitControls(camera, element);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.minAzimuthAngle = -0.42;
    controls.maxAzimuthAngle = 0.42;
    controls.minPolarAngle = 1.12;
    controls.maxPolarAngle = 1.95;
    controls.target.set(1.25, 0, 0);
    const takeControl = () => {
      manualRef.current = true;
    };
    controls.addEventListener("start", takeControl);
    return () => {
      controls.removeEventListener("start", takeControl);
      controls.dispose();
      controlsRef.current = null;
    };
  }, [camera, element, manualRef]);

  useFrame(() => controlsRef.current?.update());
  return null;
}

function Pixels({ scene, rgb }: Props) {
  const grid = useRef<THREE.Group>(null);
  const panelGeometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(4.68, 3.24, 12, 8);
    const positions = geometry.getAttribute("position");
    const colors: number[] = [];
    const color = new THREE.Color();
    for (let index = 0; index < positions.count; index += 1) {
      const horizontal = positions.getX(index) / 4.68 + 0.5;
      const vertical = positions.getY(index) / 3.24 + 0.5;
      color.setRGB(
        0.12 + horizontal * 0.68,
        0.08 + vertical * 0.72,
        0.82 - (horizontal + vertical) * 0.28,
      );
      colors.push(color.r, color.g, color.b);
    }
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    return geometry;
  }, []);
  const gridGeometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    for (let column = 0; column <= 13; column += 1) {
      const x = -2.34 + column * 0.36;
      points.push(new THREE.Vector3(x, -1.62, 0.03), new THREE.Vector3(x, 1.62, 0.03));
    }
    for (let row = 0; row <= 9; row += 1) {
      const y = -1.62 + row * 0.36;
      points.push(new THREE.Vector3(-2.34, y, 0.03), new THREE.Vector3(2.34, y, 0.03));
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, []);
  const glowTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext("2d");
    if (context) {
      const gradient = context.createRadialGradient(64, 64, 18, 64, 64, 64);
      gradient.addColorStop(0, "rgba(255,255,255,0.95)");
      gradient.addColorStop(0.42, "rgba(255,255,255,0.45)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, 128, 128);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  useFrame((_, delta) => {
    if (!grid.current) return;
    const targetScale = scene === 0 ? 1.06 : 1.42;
    const ease = 1 - Math.exp(-delta * 3);
    const scale = THREE.MathUtils.lerp(grid.current.scale.x, targetScale, ease);
    grid.current.scale.setScalar(scale);
    grid.current.rotation.y = THREE.MathUtils.lerp(grid.current.rotation.y, scene === 0 ? -0.16 : 0, ease);
  });

  const channels = [
    { x: -0.48, color: `rgb(${rgb[0]},0,0)` },
    { x: 0, color: `rgb(0,${rgb[1]},0)` },
    { x: 0.48, color: `rgb(0,0,${rgb[2]})` },
  ];
  const mixedColor = `rgb(${rgb.join(",")})`;

  return (
    <group position={[1.35, 0.15, 0]}>
      <group ref={grid} visible={scene < 2}>
        <mesh geometry={panelGeometry}>
          <meshBasicMaterial vertexColors toneMapped={false} />
        </mesh>
        <lineSegments geometry={gridGeometry}>
          <lineBasicMaterial color="#07090f" transparent opacity={0.82} />
        </lineSegments>
        <mesh position-z={-0.08}>
          <boxGeometry args={[4.82, 3.38, 0.14]} />
          <meshStandardMaterial color="#121722" metalness={0.45} roughness={0.4} />
        </mesh>
      </group>

      {scene >= 2 && (
        <group>
          {scene === 3 && (
            <sprite position={[0, 0, -0.3]} scale={[4.35, 5.2, 1]}>
              <spriteMaterial
                map={glowTexture}
                color={mixedColor}
                transparent
                opacity={0.68}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                toneMapped={false}
              />
            </sprite>
          )}
          <mesh position={[0, 0, -0.2]}>
            <boxGeometry args={[2.05, 3.05, 0.18]} />
            <meshStandardMaterial
              color="#111827"
              emissive={scene === 3 ? mixedColor : "#000000"}
              emissiveIntensity={scene === 3 ? 0.18 : 0}
              roughness={0.35}
              metalness={0.5}
            />
          </mesh>
          {channels.map((channel) => (
            <mesh key={channel.x} position={[channel.x, 0, 0]}>
              <boxGeometry args={[0.39, 2.72, 0.2]} />
              <meshStandardMaterial color={channel.color} emissive={channel.color} emissiveIntensity={1.35} toneMapped={false} />
            </mesh>
          ))}
          {scene === 3 && <pointLight color={mixedColor} intensity={7} distance={4.5} position={[0, 0, 1.2]} />}
        </group>
      )}
    </group>
  );
}

export function PixelCanvas(props: Props) {
  const manualRef = useRef(false);
  return (
    <div className="absolute inset-0" aria-hidden>
      <Canvas
        dpr={[1, 1.55]}
        camera={{ position: CAMERA_POSITIONS[0], fov: 40, near: 0.1, far: 40 }}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        fallback={<WebGLFallback />}
        onCreated={({ gl }) => {
          gl.setClearColor("#07090f");
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
          capturePixelEvent("webgl_ready");
        }}
      >
        <CameraRig scene={props.scene} manualRef={manualRef} />
        <MouseOrbit manualRef={manualRef} />
        <ambientLight intensity={0.38} color="#b9c8ea" />
        <directionalLight position={[4, 6, 8]} intensity={1.8} color="#ffffff" />
        <Pixels {...props} />
      </Canvas>
    </div>
  );
}
