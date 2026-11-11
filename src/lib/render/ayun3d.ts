// Tampilan 3D gedung (Three.js). Dimuat dengan import() dinamis saat mode 3D dipilih.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { type AyunView, type Renderer, WARNA, warnaDrift } from './types';
import { THETA_IZIN } from '../models/ayun/drift';

const BW = 9;
const BD = 6;
const SLAB = 0.4;

export function createAyun3d(canvas: HTMLCanvasElement): Renderer<AyunView> {
	const gl = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
	gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
	gl.shadowMap.enabled = true;
	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 600);
	const controls = new OrbitControls(camera, canvas);
	controls.enableDamping = true;
	controls.maxPolarAngle = Math.PI / 2 - 0.03;
	scene.add(new THREE.HemisphereLight(0xffffff, 0xcdbf9f, 1.6));
	const sun = new THREE.DirectionalLight(0xffffff, 2.2);
	sun.castShadow = true;
	sun.shadow.mapSize.set(1024, 1024);
	scene.add(sun, sun.target);

	const tanah = new THREE.Mesh(new THREE.BoxGeometry(BW * 3.2, 0.8, BD * 3.2), new THREE.MeshStandardMaterial({ color: 0xddd0b3 }));
	tanah.position.y = -0.4;
	tanah.receiveShadow = true;
	scene.add(tanah);

	const gedung = new THREE.Group();
	scene.add(gedung);
	type Tingkat = { grup: THREE.Group; kaca: THREE.MeshStandardMaterial; pelat: THREE.Mesh; silang: THREE.LineSegments };
	let tingkat: Tingkat[] = [];
	let tmd: { bola: THREE.Mesh; tali: THREE.Line; rangka: THREE.Line } | null = null;
	let env = new Float64Array(0);
	let nBangun = 0;
	let hBangun = 0;

	const matKolom = new THREE.MeshStandardMaterial({ color: 0x2b2720 });
	const matPelat = new THREE.MeshStandardMaterial({ color: 0xf3eee2 });
	const matGaris = new THREE.LineBasicMaterial({ color: WARNA.baja });
	const matTali = new THREE.LineBasicMaterial({ color: 0x4a4438 });

	function bangun(n: number, h: number) {
		gedung.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
		gedung.clear();
		tingkat = [];
		env = new Float64Array(n);
		const th = h - SLAB;
		for (let i = 0; i < n; i++) {
			const grup = new THREE.Group();
			grup.matrixAutoUpdate = false; // matriks geser diisi tiap frame
			const kaca = new THREE.MeshStandardMaterial({ color: WARNA.aman, transparent: true, opacity: 0.5, roughness: 0.3 });
			const dinding = new THREE.Mesh(new THREE.BoxGeometry(BW - 0.3, th, BD - 0.3), kaca);
			dinding.position.y = th / 2;
			grup.add(dinding);
			for (const sx of [-1, 1])
				for (const sz of [-1, 1]) {
					const k = new THREE.Mesh(new THREE.BoxGeometry(0.45, th, 0.45), matKolom);
					k.position.set((sx * (BW - 0.45)) / 2, th / 2, (sz * (BD - 0.45)) / 2);
					k.castShadow = true;
					grup.add(k);
				}
			const z = BD / 2 + 0.02;
			const silang = new THREE.LineSegments(
				new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-BW / 2, 0, z), new THREE.Vector3(BW / 2, th, z), new THREE.Vector3(BW / 2, 0, z), new THREE.Vector3(-BW / 2, th, z)]),
				matGaris
			);
			grup.add(silang);
			const pelat = new THREE.Mesh(new THREE.BoxGeometry(BW, SLAB, BD), matPelat);
			pelat.castShadow = pelat.receiveShadow = true;
			gedung.add(grup, pelat);
			tingkat.push({ grup, kaca, pelat, silang });
		}
		const bola = new THREE.Mesh(new THREE.SphereGeometry(0.8, 24, 16), new THREE.MeshStandardMaterial({ color: WARNA.perunggu, metalness: 0.5, roughness: 0.4 }));
		bola.castShadow = true;
		const tali = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), matTali);
		const rangka = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-2.2, 0, 0), new THREE.Vector3(0, 3, 0), new THREE.Vector3(2.2, 0, 0)]), matTali);
		gedung.add(bola, tali, rangka);
		tmd = { bola, tali, rangka };

		const H = n * h;
		controls.target.set(0, H * 0.42, 0);
		camera.position.set(H * 0.6 + 18, H * 0.62 + 8, H * 1.05 + 26);
		sun.position.set(H * 0.4 + 12, H + 22, H * 0.3 + 14);
		sun.target.position.set(0, H / 2, 0);
		const sc = sun.shadow.camera;
		sc.left = sc.bottom = -(H * 0.6 + 14);
		sc.right = sc.top = H * 0.6 + 14;
		sc.far = H * 3 + 80;
		sc.updateProjectionMatrix();
		nBangun = n;
		hBangun = h;
	}

	function draw(v: AyunView) {
		const w = canvas.clientWidth;
		const h = canvas.clientHeight;
		if (!w || !h) return;
		if (canvas.width !== Math.round(w * gl.getPixelRatio())) {
			gl.setSize(w, h, false);
			camera.aspect = w / h;
			camera.updateProjectionMatrix();
		}
		if (v.n !== nBangun || v.h !== hBangun) bangun(v.n, v.h);
		const g = v.ug * v.skala;
		tanah.position.x = g;
		const off = (i: number) => g + (i > 0 ? v.u[i - 1] * v.skala : 0);
		const th = v.h - SLAB;
		tingkat.forEach((t, i) => {
			const ob = off(i);
			const ot = off(i + 1);
			// geser murni: x' = x + (ot − ob) y / th, lalu translasi ke dasar tingkat
			t.grup.matrix.set(1, (ot - ob) / th, 0, ob, 0, 1, 0, i * v.h, 0, 0, 1, 0, 0, 0, 0, 1);
			t.pelat.position.set(ot, (i + 1) * v.h - SLAB / 2, 0);
			env[i] = Math.max(Math.abs(v.drift[i]), env[i] * 0.985);
			t.kaca.color.set(v.retak[i] > THETA_IZIN ? WARNA.bahaya : warnaDrift(env[i], THETA_IZIN));
			t.silang.visible = !!v.bracing?.[i];
		});
		if (tmd) {
			const ada = v.tmd !== null;
			tmd.bola.visible = tmd.tali.visible = tmd.rangka.visible = ada;
			if (ada) {
				const zr = v.n * v.h;
				const or = off(v.n);
				const rel = Math.max(-BW * 0.42, Math.min(BW * 0.42, (v.tmd! - v.u[v.n - 1]) * v.skala));
				tmd.rangka.position.set(or, zr, 0);
				tmd.bola.position.set(or + rel, zr + 0.9, 0);
				const p = tmd.tali.geometry.attributes.position as THREE.BufferAttribute;
				p.setXYZ(0, or, zr + 3, 0);
				p.setXYZ(1, or + rel, zr + 0.9, 0);
				p.needsUpdate = true;
			}
		}
		controls.update();
		gl.render(scene, camera);
	}

	return {
		draw,
		dispose() {
			controls.dispose();
			scene.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
			gl.dispose();
		}
	};
}
