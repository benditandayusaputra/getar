// Tampilan 3D bilah (Three.js). Posisi vertex bilah diperbarui tiap frame dari w(x, t).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { LarasView, Renderer } from './types';

const SEG = 40;
const AMP = 0.02;
const Z0 = 0.022;

export function createLaras3d(canvas: HTMLCanvasElement): Renderer<LarasView> {
	const gl = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
	gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
	gl.shadowMap.enabled = true;
	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera(36, 1, 0.01, 10);
	camera.position.set(0.12, 0.2, 0.4);
	const controls = new OrbitControls(camera, canvas);
	controls.enableDamping = true;
	controls.target.set(0, 0.01, 0);
	controls.minDistance = 0.2;
	controls.maxDistance = 1.5;
	scene.add(new THREE.HemisphereLight(0xffffff, 0x8b7a5a, 1.8));
	const sun = new THREE.DirectionalLight(0xffffff, 2.6);
	sun.position.set(0.25, 0.6, 0.35);
	sun.castShadow = true;
	const sc = sun.shadow.camera;
	sc.left = sc.bottom = -0.4;
	sc.right = sc.top = 0.4;
	sc.near = 0.05;
	sc.far = 2;
	scene.add(sun);

	const kayu = new THREE.MeshStandardMaterial({ color: 0x7b4a2a, roughness: 0.8 });
	const kayuTua = new THREE.MeshStandardMaterial({ color: 0x3b2412, roughness: 0.9 });
	const logam = new THREE.MeshStandardMaterial({ color: 0xc9973f, metalness: 0.55, roughness: 0.32 });
	const rancakan = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.034, 0.1), kayu);
	rancakan.position.y = -0.017;
	rancakan.receiveShadow = true;
	const penyangga = [0, 1].map(() => new THREE.Mesh(new THREE.BoxGeometry(0.012, Z0, 1), kayuTua));
	const bilah = new THREE.Mesh(new THREE.BufferGeometry(), logam);
	bilah.castShadow = true;
	const penanda = new THREE.Mesh(new THREE.TorusGeometry(0.008, 0.0012, 8, 24), new THREE.MeshBasicMaterial({ color: 0x1e1b16 }));
	penanda.rotation.x = Math.PI / 2;
	const tabuh = new THREE.Mesh(new THREE.SphereGeometry(0.011, 20, 14), new THREE.MeshStandardMaterial({ color: 0xc8b48a, roughness: 0.9 }));
	scene.add(rancakan, ...penyangga, bilah, penanda, tabuh);

	let dasar = new Float32Array(0); // posisi vertex bilah tanpa lendutan
	let geo = { L: 0, b: 0, h: 0 };

	function bangun(v: LarasView) {
		bilah.geometry.dispose();
		bilah.geometry = new THREE.BoxGeometry(v.L, v.h, v.b, SEG, 1, 1);
		dasar = (bilah.geometry.attributes.position.array as Float32Array).slice();
		rancakan.scale.z = (v.b + 0.024) / 0.1;
		penyangga.forEach((p) => (p.scale.z = v.b));
		geo = { L: v.L, b: v.b, h: v.h };
	}

	function draw(v: LarasView) {
		const w = canvas.clientWidth;
		const h = canvas.clientHeight;
		if (!w || !h) return;
		if (canvas.width !== Math.round(w * gl.getPixelRatio())) {
			gl.setSize(w, h, false);
			camera.aspect = w / h;
			camera.updateProjectionMatrix();
		}
		if (v.L !== geo.L || v.b !== geo.b || v.h !== geo.h) bangun(v);
		logam.color.set(v.warna[0]);
		penyangga.forEach((p, i) => p.position.set(((v.simpul[i] ?? 0.5) - 0.5) * v.L, Z0 / 2, 0));
		const pos = bilah.geometry.attributes.position as THREE.BufferAttribute;
		for (let i = 0; i < pos.count; i++) pos.setY(i, dasar[3 * i + 1] + Z0 + v.h / 2 + v.w(dasar[3 * i] / v.L + 0.5) * AMP);
		pos.needsUpdate = true;
		bilah.geometry.computeVertexNormals();
		const yAtas = Z0 + v.h + v.w(v.xs) * AMP;
		penanda.position.set((v.xs - 0.5) * v.L, yAtas + 0.001, 0);
		tabuh.visible = v.umur < 0.45;
		tabuh.position.set((v.xs - 0.5) * v.L, yAtas + 0.011 + Math.max(0, v.umur - 0.04) * 0.28, 0);
		controls.update();
		gl.render(scene, camera);
	}

	// klik dibedakan dari seret (memutar kamera): seret lebih dari 5 px tidak dihitung pukulan
	let turun = { x: 0, y: 0 };
	const onDown = (e: PointerEvent) => (turun = { x: e.clientX, y: e.clientY });
	canvas.addEventListener('pointerdown', onDown);
	const ray = new THREE.Raycaster();

	function pick(clientX: number, clientY: number, klik = true): number | null {
		if (klik && Math.hypot(clientX - turun.x, clientY - turun.y) > 5) return null;
		const r = canvas.getBoundingClientRect();
		ray.setFromCamera(new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1), camera);
		const kena = ray.intersectObject(bilah)[0];
		return kena ? Math.min(1, Math.max(0, kena.point.x / geo.L + 0.5)) : null;
	}

	return {
		draw,
		pick,
		dispose() {
			canvas.removeEventListener('pointerdown', onDown);
			controls.dispose();
			scene.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
			gl.dispose();
		}
	};
}
