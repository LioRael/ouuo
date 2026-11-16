import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { keyboardKeys, keyByCode } from './layout'

function keycapGeometry(extra = 0, study = true) {
  const segments = study ? 128 : 64
  const topRings = study ? 32 : 16
  const rings: [number, number, number][] = [
    [0.95, 0, 0.18],
    [0.976, 0.012, 0.19],
    [0.983, 0.035, 0.2],
    [0.982, 0.065, 0.2],
    [0.952, 0.2, 0.22],
    [0.922, 0.34, 0.245],
    [0.892, 0.47, 0.27],
    [0.879, 0.515, 0.278],
    [0.858, 0.55, 0.284],
    [0.831, 0.572, 0.29],
    [0.8, 0.58, 0.29],
  ]
  for (let i = 1; i <= topRings; i++) {
    const scale = 1 - i / (topRings + 1)
    rings.push([0.8 * scale, 0, 0.29 * scale])
  }
  const positions: number[] = []
  const uvs: number[] = []
  const surfaceUvs: number[] = []
  const indices: number[] = []
  for (const [ring, [half, height, radius]] of rings.entries()) {
    for (let i = 0; i <= segments; i++) {
      const angle = ((i % segments) / segments) * Math.PI * 2
      const x = Math.cos(angle)
      const z = Math.sin(angle)
      let distance = half / Math.max(Math.abs(x), Math.abs(z))
      if (distance * Math.min(Math.abs(x), Math.abs(z)) > half - radius) {
        const dot = (Math.abs(x) + Math.abs(z)) * (half - radius)
        distance =
          dot +
          Math.sqrt(dot * dot - 2 * (half - radius) ** 2 + radius * radius)
      }
      const localX = distance * x
      // Extend the middle of wide caps; scaling would stretch the bevel and grain.
      const px = localX + Math.sign(x) * extra
      const pz = distance * z
      const surfaceHeight =
        ring >= 10
          ? 0.58 - 0.055 * (1 - (localX / 0.8) ** 2) * (1 - (pz / 0.8) ** 2)
          : height
      positions.push(px, surfaceHeight, pz)
      uvs.push(px / (1.6 + extra * 2) + 0.5, 0.5 - pz / 1.6)
      surfaceUvs.push(
        ...(ring < 10
          ? [(i / segments) * 4, height]
          : [px / 1.6 + 0.5, 0.5 - pz / 1.6]),
      )
    }
  }
  for (let ring = 0; ring < rings.length - 1; ring++) {
    for (let i = 0; i < segments; i++) {
      const a = ring * (segments + 1) + i
      const b = a + segments + 1
      indices.push(a, b, a + 1, a + 1, b, b + 1)
    }
  }
  const center = positions.length / 3
  for (const x of extra ? [extra, -extra] : [0]) {
    positions.push(x, 0.525, 0)
    uvs.push(x / (1.6 + extra * 2) + 0.5, 0.5)
    surfaceUvs.push(x / 1.6 + 0.5, 0.5)
  }
  const last = (rings.length - 1) * (segments + 1)
  for (let i = 0; i < segments; i++) {
    const left = i > segments / 4 && i <= (segments * 3) / 4
    const pivot = center + (extra && left ? 1 : 0)
    indices.push(last + i, pivot, last + i + 1)
    if (extra && (i === segments / 4 || i === (segments * 3) / 4))
      indices.push(last + i + 1, pivot, center + (left ? 0 : 1))
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3),
  )
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setAttribute('uv1', new THREE.Float32BufferAttribute(surfaceUvs, 2))
  geometry.setIndex(indices)
  const sideIndices = 10 * segments * 6
  geometry.addGroup(0, sideIndices, 0)
  geometry.addGroup(sideIndices, indices.length - sideIndices, 1)
  geometry.computeVertexNormals()
  const normals = geometry.getAttribute('normal')
  for (let ring = 0; ring < rings.length; ring++) {
    const first = ring * (segments + 1)
    const last = first + segments
    const normal = new THREE.Vector3()
      .fromBufferAttribute(normals, first)
      .add(new THREE.Vector3().fromBufferAttribute(normals, last))
      .normalize()
    normals.setXYZ(first, normal.x, normal.y, normal.z)
    normals.setXYZ(last, normal.x, normal.y, normal.z)
  }
  return geometry
}

function roundedOutline(half: number, radius: number, depth = half) {
  const path = new THREE.Shape()
  path.moveTo(-half + radius, -depth)
  path.lineTo(half - radius, -depth)
  path.quadraticCurveTo(half, -depth, half, -depth + radius)
  path.lineTo(half, depth - radius)
  path.quadraticCurveTo(half, depth, half - radius, depth)
  path.lineTo(-half + radius, depth)
  path.quadraticCurveTo(-half, depth, -half, depth - radius)
  path.lineTo(-half, -depth + radius)
  path.quadraticCurveTo(-half, -depth, -half + radius, -depth)
  return path
}

export function mountKeycap(
  host: HTMLElement,
  target: HTMLButtonElement,
  cameraControl: HTMLButtonElement,
  onFailure: () => void,
) {
  const scene = mountScene(
    host,
    [{ ...keyByCode.get('KeyA')!, target, x: 0, z: 0 }],
    cameraControl,
    onFailure,
    true,
  )
  return { press: () => scene.press('KeyA'), dispose: scene.dispose }
}

export function mountKeyboard(host: HTMLElement, onFailure: () => void) {
  return mountScene(
    host,
    keyboardKeys.map((key) => ({
      ...key,
      target: host.querySelector<HTMLButtonElement>(
        `[data-code="${key.code}"]`,
      )!,
      x: (key.center - 8) * 2.2,
      z: (key.row - 2.5) * 2.2,
    })),
    host.closest<HTMLElement>('.keyboard-room')!,
    onFailure,
    false,
  )
}

function mountScene(
  host: HTMLElement,
  keys: ((typeof keyboardKeys)[number] & {
    target: HTMLButtonElement
    x: number
    z: number
  })[],
  cameraControl: HTMLElement,
  onFailure: () => void,
  study: boolean,
) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.setClearColor(0x101011)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1
  renderer.domElement.setAttribute('aria-hidden', 'true')
  host.prepend(renderer.domElement)
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, study ? 40 : 100)
  const pmrem = new THREE.PMREMGenerator(renderer)
  const room = new THREE.Scene()
  room.background = new THREE.Color(0.15, 0.15, 0.15)
  const softboxes = [
    { width: 7, height: 4, position: [-3, 5, 3], color: [4.5, 4.5, 4.5] },
    { width: 2, height: 4, position: [4, 2, -2], color: [0.9, 1, 1.05] },
    { width: 5, height: 1, position: [0, 3, -4], color: [2, 2.05, 2.1] },
  ].map(({ width, height, position, color }) => {
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(color[0], color[1], color[2]),
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    )
    panel.position.set(position[0], position[1], position[2])
    panel.lookAt(0, 0.5, 0)
    room.add(panel)
    return panel
  })
  const environment = pmrem.fromScene(room, 0.04)
  scene.environment = environment.texture
  scene.environmentIntensity = 0.7
  for (const panel of softboxes) {
    panel.geometry.dispose()
    panel.material.dispose()
  }
  pmrem.dispose()

  const textures: THREE.Texture[] = []
  const size = 256
  const noise = new Float32Array(size * size)
  let seed = 7
  for (let i = 0; i < noise.length; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0
    noise[i] = (seed >>> 24) / 255
  }
  const grain = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let height = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const weight = (dx === 0 ? 2 : 1) * (dy === 0 ? 2 : 1)
          height +=
            noise[((y + dy + size) % size) * size + ((x + dx + size) % size)] *
            weight
        }
      }
      height /= 16
      // Rounded grain affects both relief (R) and specular spread (G), not pigment.
      grain.set(
        [64 + height * 128, 205 + height * 45, 0, 255],
        (y * size + x) * 4,
      )
    }
  }
  const surface = new THREE.DataTexture(grain, size, size)
  surface.channel = 1
  surface.wrapS = surface.wrapT = THREE.RepeatWrapping
  surface.magFilter = THREE.LinearFilter
  surface.minFilter = THREE.LinearMipmapLinearFilter
  surface.generateMipmaps = true
  surface.anisotropy = renderer.capabilities.getMaxAnisotropy()
  surface.repeat.set(3, 3)
  surface.needsUpdate = true
  textures.push(surface)

  const material = new THREE.MeshPhysicalMaterial({
    bumpMap: surface,
    bumpScale: 0.009,
    roughnessMap: surface,
    roughness: 0.66,
    metalness: 0,
    ior: 1.46,
    specularIntensity: 1,
  })
  const sideMaterial = material.clone()
  sideMaterial.color.setHex(0x252526)

  const baseMaterial = new THREE.MeshStandardMaterial({
    color: study ? 0x202022 : 0x38383c,
    metalness: study ? 0.85 : 0.72,
    roughness: study ? 0.48 : 0.4,
  })
  const halfWidth = study ? 1.3 : 18.35
  const halfDepth = study ? 1.3 : 7.5
  const caseRadius = study ? 0.15 : 0.4
  const outline = roundedOutline(halfWidth, caseRadius, halfDepth)
  for (const key of keys) {
    const hole = roundedOutline(1.04 + (key.units - 1) * 1.1, 0.2, 1.04)
      .getPoints(8)
      .map((point) => point.add(new THREE.Vector2(key.x, -key.z)))
    outline.holes.push(new THREE.Path(hole))
  }
  const plate = new THREE.Mesh(
    new THREE.ExtrudeGeometry(outline, {
      depth: 0.18,
      bevelEnabled: true,
      bevelSize: 0.025,
      bevelThickness: 0.025,
      bevelSegments: 3,
      curveSegments: 12,
      steps: 1,
    }),
    baseMaterial,
  )
  plate.rotation.x = -Math.PI / 2
  plate.position.y = -0.27
  plate.receiveShadow = plate.castShadow = true
  scene.add(plate)
  const wellMaterial = new THREE.MeshStandardMaterial({
    color: 0x080809,
    roughness: 0.6,
    metalness: 0.3,
  })
  const well = new THREE.Mesh(
    new RoundedBoxGeometry(
      halfWidth * 2,
      study ? 0.04 : 0.37,
      halfDepth * 2,
      3,
      0.02,
    ),
    wellMaterial,
  )
  well.position.y = study ? -0.265 : -0.43
  well.receiveShadow = true
  scene.add(well)
  const stemGeometry = new RoundedBoxGeometry(0.6, 0.3, 0.6, 3, 0.04)

  const underlightVertex = `varying vec2 vUv; varying vec2 chassisPosition;
    void main() {
      vUv = uv;
      vec4 world = modelMatrix * vec4(position, 1.0);
      chassisPosition = world.xz;
      gl_Position = projectionMatrix * viewMatrix * world;
    }`
  const underlightShader = `uniform vec3 corners[4]; varying vec2 chassisPosition;
    float lightMask(float inset) {
      vec2 q = abs(chassisPosition) - vec2(${(halfWidth - caseRadius).toFixed(3)}, ${(halfDepth - caseRadius).toFixed(3)}) + inset;
      float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - ${caseRadius};
      return 1.0 - smoothstep(-0.25, 0.0, d);
    }
    vec3 lightColor(vec2 position) {
      vec2 blend = clamp(position / vec2(0.97 + extra, 0.97) * 0.5 + 0.5, 0.0, 1.0);
      return mix(mix(corners[0], corners[2], blend.x), mix(corners[1], corners[3], blend.x), blend.y);
    }`
  const glowMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      strength: { value: 0 },
      extra: { value: 0 },
      clearance: { value: study ? 0 : 0.03 },
      corners: { value: Array.from({ length: 4 }, () => new THREE.Color()) },
    },
    vertexShader: underlightVertex,
    fragmentShader: `varying vec2 vUv; uniform float strength; uniform float extra; uniform float clearance;
      ${underlightShader}
      void main() {
        vec2 p = (vUv - 0.5) * vec2(2.4 + extra * 2.0, -2.4);
        vec2 q = abs(p) - vec2(0.77 + extra, 0.77) - clearance;
        float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - 0.2 - clearance;
        float ring = exp(-abs(d) * 16.0);
        float corner = exp(-pow((abs(p.x) - extra - abs(p.y)) * 6.0, 2.0));
        float intensity = ring * (0.24 + 0.76 * corner);
        float core = pow(corner, 3.0) * exp(-abs(d) * 80.0);
        vec3 color = lightColor(p);
        color = mix(color, color + vec3(0.8), core * 0.6);
        gl_FragColor = vec4(color, intensity * strength * lightMask(0.0));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  })
  const glowGeometry = new THREE.PlaneGeometry(2.4, 2.4)
  // Fade spill before the outer rail while preserving the cap's close-contact ring.
  const spillMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      strength: { value: 0 },
      extra: { value: 0 },
      progress: { value: 1 },
      spread: { value: study ? 0.8 : 2.5 },
      corners: { value: Array.from({ length: 4 }, () => new THREE.Color()) },
    },
    vertexShader: underlightVertex,
    fragmentShader: `varying vec2 vUv; uniform float strength; uniform float extra; uniform float progress; uniform float spread;
      ${underlightShader}
      void main() {
        vec2 position = (vUv - 0.5) * vec2(7.2 + extra * 2.0, -7.2);
        vec2 p = abs(position);
        vec2 q = p - vec2(0.77 + extra, 0.77);
        float d = max(length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - 0.2, 0.0);
        float corner = 0.3 + 0.7 * exp(-pow((p.x - extra - p.y) * 1.5, 2.0));
        float reach = mix(0.12, spread, progress);
        float pulse = exp(-pow(d / reach, 1.5)) * pow(1.0 - progress, 1.3);
        float halo = exp(-d * 3.4) * strength * 0.22;
        float edge = 1.0 - smoothstep(2.8, 3.6, max(p.x - extra, p.y));
        gl_FragColor = vec4(lightColor(position), (halo + pulse * 0.85) * corner * edge * lightMask(${study ? '0.0' : '0.75'}));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  })
  const spillGeometry = new THREE.PlaneGeometry(7.2, 7.2)
  const geometries = new Map<number, THREE.BufferGeometry>()
  const homingGeometry = new RoundedBoxGeometry(0.34, 0.025, 0.045, 2, 0.012)
  const caps = keys.map((key) => {
    const extra = (key.units - 1) * 1.1
    // Sample one spatial field: quiet color regions and steeper transitions share their edges.
    const lightColors = [-1, 1].flatMap((side) =>
      [-1, 1].map((end) => {
        const x = key.x + side * (0.83 + extra)
        const z = key.z + end * 0.83
        const phase = x * 0.32 + z * 0.48
        const hue = 0.52 + phase * 0.15 + Math.sin(phase) * 0.42
        return new THREE.Color().setHSL(hue, 0.94, 0.5)
      }),
    )
    const label = document.createElement('canvas')
    label.height = study ? 1024 : 256
    label.width = Math.round(label.height * (1 + extra / 0.8))
    const context = label.getContext('2d')!
    context.fillStyle = key.accent ? '#9c3418' : '#252526'
    context.fillRect(0, 0, label.width, label.height)
    context.scale(label.height / 1024, label.height / 1024)
    const center = (label.width / label.height) * 512
    context.fillStyle = '#d4d4ce'
    context.font = `500 ${study ? 164 : key.label.length > 1 || key.row === 0 ? 240 : 340}px Arial, sans-serif`
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(
      key.code === 'Space' ? 'o u u o' : key.label,
      center,
      !study && (key.legend || key.icon) ? 660 : 512,
    )
    if (!study && key.legend) {
      context.fillStyle = '#aaa9a5'
      context.font = '400 200px Arial, sans-serif'
      context.fillText(key.legend, center, 325)
    }
    if (!study && key.icon) {
      context.save()
      context.translate(center - 144, 181)
      context.scale(12, 12)
      context.strokeStyle = '#c2987c'
      context.lineWidth = 1.7
      context.lineCap = context.lineJoin = 'round'
      context.stroke(new Path2D(key.icon))
      context.restore()
    }
    const map = new THREE.CanvasTexture(label)
    map.colorSpace = THREE.SRGBColorSpace
    map.anisotropy = renderer.capabilities.getMaxAnisotropy()
    textures.push(map)
    const top = material.clone()
    top.map = map
    let geometry = geometries.get(key.units)
    if (!geometry) {
      geometry = keycapGeometry(extra, study)
      geometries.set(key.units, geometry)
    }
    const cap = new THREE.Mesh(geometry, study ? [sideMaterial, top] : top)
    cap.position.set(key.x, 0.2, key.z)
    cap.castShadow = cap.receiveShadow = true
    scene.add(cap)
    if (!study && (key.code === 'KeyF' || key.code === 'KeyJ')) {
      const homing = new THREE.Mesh(homingGeometry, sideMaterial)
      homing.position.set(0, 0.565, 0.56)
      homing.castShadow = true
      cap.add(homing)
    }
    const stem = new THREE.Mesh(stemGeometry, wellMaterial)
    stem.position.set(key.x, -0.09, key.z)
    scene.add(stem)
    const glow = new THREE.Mesh(glowGeometry, glowMaterial.clone())
    glow.material.uniforms.extra.value = extra
    glow.material.uniforms.corners.value = lightColors
    glow.scale.x = 1 + extra / 1.2
    glow.rotation.x = -Math.PI / 2
    glow.position.set(key.x, -0.14, key.z)
    scene.add(glow)
    const spill = new THREE.Mesh(spillGeometry, spillMaterial.clone())
    spill.material.uniforms.extra.value = extra
    spill.material.uniforms.corners.value = lightColors
    spill.scale.x = 1 + extra / 3.6
    spill.rotation.x = -Math.PI / 2
    spill.position.set(key.x, -0.06, key.z)
    scene.add(spill)
    return {
      ...key,
      extra,
      lightColors,
      cap,
      glow,
      spill,
      travel: 0,
      illumination: 0,
      pulseAge: 1,
      pressUntil: 0,
      pendingPress: false,
    }
  })
  const capByCode = new Map(caps.map((key) => [key.code, key]))
  // A fixed light pool illuminates the strongest pulses; every key has its own glow planes.
  const underlights = Array.from({ length: study ? 4 : 8 }, () => {
    const light = new THREE.PointLight(0xffffff, 0, 3.5, 2)
    scene.add(light)
    return light
  })
  const knob = new THREE.Group()
  const viewWheel = new THREE.Group()
  const soundLever = new THREE.Group()
  if (!study) {
    knob.position.set(15.5, 0.13, -5.5)
    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.83, 0.83, 0.17, 72),
      baseMaterial,
    )
    rim.castShadow = rim.receiveShadow = true
    knob.add(rim)
    const dial = new THREE.Mesh(
      new THREE.CylinderGeometry(0.67, 0.7, 0.38, 72),
      new THREE.MeshPhysicalMaterial({
        color: 0xb54e24,
        metalness: 0.65,
        roughness: 0.4,
        flatShading: true,
      }),
    )
    dial.position.y = 0.2
    dial.castShadow = dial.receiveShadow = true
    knob.add(dial)
    const indicator = new THREE.Mesh(
      new RoundedBoxGeometry(0.055, 0.012, 0.32, 2, 0.005),
      wellMaterial,
    )
    indicator.position.set(0, 0.4, -0.34)
    knob.add(indicator)
    scene.add(knob)

    viewWheel.position.set(18.45, -0.04, -3.8)
    const wheelMetal = new THREE.MeshStandardMaterial({
      color: 0x8c8580,
      metalness: 0.8,
      roughness: 0.42,
    })
    const wheel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.68, 0.68, 0.65, 48),
      wellMaterial,
    )
    wheel.rotation.z = Math.PI / 2
    wheel.castShadow = true
    viewWheel.add(wheel)
    const toothGeometry = new THREE.BoxGeometry(0.61, 0.055, 0.045)
    for (let i = 0; i < 36; i++) {
      const theta = (i / 36) * Math.PI * 2
      const tooth = new THREE.Mesh(toothGeometry, wheelMetal)
      tooth.position.set(0, Math.cos(theta) * 0.68, Math.sin(theta) * 0.68)
      tooth.rotation.x = theta
      tooth.castShadow = true
      viewWheel.add(tooth)
    }
    scene.add(viewWheel)

    const switchMount = new THREE.Mesh(
      new RoundedBoxGeometry(1.3, 0.24, 1.9, 3, 0.08),
      baseMaterial,
    )
    switchMount.position.set(-18.15, -0.17, 2.9)
    switchMount.castShadow = switchMount.receiveShadow = true
    scene.add(switchMount)
    const soundWell = new THREE.Mesh(
      new RoundedBoxGeometry(0.6, 0.2, 1.55, 3, 0.05),
      wellMaterial,
    )
    soundWell.position.set(-18.45, -0.04, 2.9)
    soundWell.castShadow = soundWell.receiveShadow = true
    scene.add(soundWell)
    const soundBand = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.025, 0.58),
      new THREE.MeshStandardMaterial({ color: 0xc2703d, roughness: 0.6 }),
    )
    soundBand.position.set(-18.45, 0.07, 2.64)
    scene.add(soundBand)
    const lever = new THREE.Mesh(
      new RoundedBoxGeometry(0.6, 0.18, 0.4, 3, 0.035),
      wheelMetal,
    )
    lever.castShadow = lever.receiveShadow = true
    soundLever.add(lever)
    const gripGeometry = new THREE.BoxGeometry(0.45, 0.025, 0.025)
    for (let i = -1; i <= 1; i++) {
      const grip = new THREE.Mesh(gripGeometry, wellMaterial)
      grip.position.set(0, 0.095, i * 0.09)
      grip.castShadow = true
      soundLever.add(grip)
    }
    soundLever.position.set(-18.45, 0.17, 3.22)
    scene.add(soundLever)
  }

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.ShadowMaterial({ opacity: 0.36 }),
  )
  floor.rotation.x = -Math.PI / 2
  floor.position.y = study ? -0.3 : -0.64
  floor.receiveShadow = true
  scene.add(floor)
  scene.add(new THREE.HemisphereLight(0xe6ecff, 0x33312c, 0.55))
  const light = new THREE.DirectionalLight(0xfffcf7, 1.8)
  light.position.set(study ? -3 : -9, study ? 6 : 18, study ? 2 : 6)
  light.castShadow = true
  light.shadow.mapSize.set(study ? 1024 : 2048, study ? 1024 : 2048)
  light.shadow.camera.left = light.shadow.camera.bottom = study ? -3 : -22
  light.shadow.camera.right = light.shadow.camera.top = study ? 3 : 22
  light.shadow.camera.far = study ? 50 : 80
  light.shadow.normalBias = 0.015
  light.shadow.bias = -0.0002
  light.shadow.radius = 4
  scene.add(light)

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
  let width = 1
  let height = 1
  let frame = 0
  let previous = 0
  let angle = 0
  let stopped = false
  let controlsDirty = true
  const dialTarget = host.querySelector<HTMLElement>('.keyboard-knob')
  const wheelTarget = host.querySelector<HTMLElement>('.keyboard-angle')
  const soundTarget = host.querySelector<HTMLElement>('.keyboard-sound')
  const project = (x: number, y: number, z: number) => {
    const point = new THREE.Vector3(x, y, z).project(camera)
    return { x: ((point.x + 1) * width) / 2, y: ((1 - point.y) * height) / 2 }
  }
  const positionControls = () => {
    const hitBoxes = []
    for (const key of caps) {
      const corners = [-0.99 - key.extra, 0.99 + key.extra].flatMap((x) =>
        [0.2, 0.78].flatMap((y) =>
          [-0.99, 0.99].map((z) => project(key.x + x, y, key.z + z)),
        ),
      )
      const left = Math.min(...corners.map((p) => p.x))
      const top = Math.min(...corners.map((p) => p.y))
      hitBoxes.push({
        left,
        top,
        right: Math.max(...corners.map((p) => p.x)),
        bottom: Math.max(top + 44, ...corners.map((p) => p.y)),
      })
      const styles = {
        left: `${left}px`,
        top: `${top}px`,
        width: `${Math.max(...corners.map((p) => p.x)) - left}px`,
        height: `${Math.max(...corners.map((p) => p.y)) - top}px`,
      }
      for (const [property, value] of Object.entries(styles)) {
        key.target.style.setProperty(
          study ? property : `--hit-${property}`,
          value,
        )
      }
    }
    if (study) {
      const control = project(1.1, -0.04, 1.15)
      cameraControl.style.left = `${control.x - 22}px`
      cameraControl.style.top = `${control.y - 22}px`
    } else {
      const dial = project(15.5, 0.4, -5.5)
      dialTarget!.style.setProperty('--hit-left', `${dial.x - 22}px`)
      dialTarget!.style.setProperty('--hit-top', `${dial.y - 22}px`)
      for (const { target, point, side } of [
        { target: wheelTarget, point: project(18.45, 0.2, -3.8), side: 1 },
        { target: soundTarget, point: project(-18.45, 0.17, 2.9), side: -1 },
      ]) {
        const top = point.y - 32
        const neighbors = hitBoxes.filter(
          (box) => box.top < top + 64 && box.bottom > top,
        )
        const left =
          side > 0
            ? Math.max(point.x - 22, ...neighbors.map((box) => box.right + 4))
            : Math.min(point.x - 22, ...neighbors.map((box) => box.left - 48))
        target!.style.setProperty('--hit-left', `${left}px`)
        target!.style.setProperty('--hit-top', `${top}px`)
      }
    }
    controlsDirty = false
  }
  const draw = (time: number) => {
    frame = 0
    if (stopped || document.hidden) return
    const dt = Math.min((time - previous) / 1000 || 1 / 60, 0.04)
    previous = time
    const backlight = study || cameraControl.dataset.backlight === 'true'
    const cameraTarget = study
      ? cameraControl.getAttribute('aria-checked') === 'true'
        ? 0.76
        : 0
      : THREE.MathUtils.degToRad(Number(cameraControl.dataset.angle))
    let animating = false
    for (const key of caps) {
      if (key.pendingPress) {
        key.pressUntil = time + 50
        key.pulseAge = 0
        key.pendingPress = false
      }
      key.pulseAge = Math.min(key.pulseAge + dt, 0.7)
      const progress =
        backlight && !reducedMotion.matches ? key.pulseAge / 0.7 : 1
      const pressed =
        key.target.hasAttribute('data-down') || time < key.pressUntil
      const destination = pressed && !reducedMotion.matches ? 0.22 : 0
      const lightTarget = pressed && backlight ? 1 : 0
      key.travel = THREE.MathUtils.damp(
        key.travel,
        destination,
        pressed ? 55 : 32,
        dt,
      )
      key.illumination = THREE.MathUtils.damp(
        key.illumination,
        lightTarget,
        pressed ? 45 : 8,
        dt,
      )
      if (Math.abs(key.travel - destination) < 0.0001) key.travel = destination
      if (Math.abs(key.illumination - lightTarget) < 0.001)
        key.illumination = lightTarget
      key.cap.position.y = 0.2 - key.travel
      key.glow.material.uniforms.strength.value = key.illumination
      key.spill.material.uniforms.strength.value = key.illumination
      key.spill.material.uniforms.progress.value = progress
      key.glow.visible = key.illumination > 0
      key.spill.visible = key.illumination > 0 || progress < 1
      animating ||=
        progress < 1 ||
        time < key.pressUntil ||
        key.travel !== destination ||
        key.illumination !== lightTarget
    }
    const litKeys = caps
      .filter((key) => key.illumination > 0)
      .sort((a, b) => b.illumination - a.illumination)
    for (const [index, light] of underlights.entries()) {
      const key = litKeys[Math.floor(index / 4)]
      light.intensity = key ? key.illumination * 0.65 : 0
      if (key) {
        light.color.copy(key.lightColors[index % 4])
        light.position.set(
          key.x + (index % 4 < 2 ? -1 : 1) * (0.83 + key.extra),
          -0.1,
          key.z + (index % 2 ? 0.83 : -0.83),
        )
      }
    }
    const previousAngle = angle
    angle = reducedMotion.matches
      ? cameraTarget
      : THREE.MathUtils.damp(angle, cameraTarget, 18, dt)
    if (Math.abs(angle - cameraTarget) < 0.0001) angle = cameraTarget
    knob.rotation.y = backlight ? -0.6 : 0.8
    viewWheel.rotation.x = angle * 4
    const leverTarget = cameraControl.dataset.sound === 'true' ? 3.22 : 2.58
    soundLever.position.z = reducedMotion.matches
      ? leverTarget
      : THREE.MathUtils.damp(soundLever.position.z, leverTarget, 28, dt)
    if (Math.abs(soundLever.position.z - leverTarget) < 0.001)
      soundLever.position.z = leverTarget
    animating ||= !study && soundLever.position.z !== leverTarget
    const distance = study ? 8 : 48
    camera.position.set(
      0,
      Math.cos(angle) * distance,
      Math.sin(angle) * distance + 0.001,
    )
    camera.lookAt(0, 0.15, 0)
    camera.updateMatrixWorld()
    if (controlsDirty || previousAngle !== angle) positionControls()
    renderer.render(scene, camera)
    if (!host.hasAttribute('data-rendered'))
      host.setAttribute('data-rendered', '')
    if (animating || angle !== cameraTarget) wake()
  }
  const wake = () => {
    if (!stopped && !frame && !document.hidden)
      frame = requestAnimationFrame(draw)
  }
  const resize = new ResizeObserver(() => {
    width = host.clientWidth
    height = host.clientHeight
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.zoom = study
      ? Math.min(1.35, width / 570)
      : (2 * 48 * Math.tan(THREE.MathUtils.degToRad(16)) * camera.aspect) / 40
    camera.updateProjectionMatrix()
    controlsDirty = true
    wake()
  })
  resize.observe(host)
  const observer = new MutationObserver(wake)
  observer.observe(host, {
    attributes: true,
    subtree: true,
    attributeFilter: ['data-down'],
  })
  observer.observe(cameraControl, {
    attributes: true,
    attributeFilter: study
      ? ['aria-checked']
      : ['data-angle', 'data-backlight', 'data-sound'],
  })
  const contextLost = (event: Event) => {
    event.preventDefault()
    stopped = true
    cancelAnimationFrame(frame)
    host.removeAttribute('data-rendered')
    onFailure()
  }
  renderer.domElement.addEventListener('webglcontextlost', contextLost)
  const visibilityChanged = () => {
    for (const key of caps) {
      key.pendingPress = false
      key.pressUntil = 0
      key.pulseAge = 1
    }
    wake()
  }
  document.addEventListener('visibilitychange', visibilityChanged)
  reducedMotion.addEventListener('change', wake)
  wake()

  const dispose = () => {
    stopped = true
    cancelAnimationFrame(frame)
    resize.disconnect()
    observer.disconnect()
    reducedMotion.removeEventListener('change', wake)
    document.removeEventListener('visibilitychange', visibilityChanged)
    renderer.domElement.removeEventListener('webglcontextlost', contextLost)
    host.removeAttribute('data-rendered')
    const resources = new Set<THREE.BufferGeometry | THREE.Material>([
      material,
      sideMaterial,
      glowMaterial,
      spillMaterial,
      homingGeometry,
    ])
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        resources.add(object.geometry)
        for (const item of Array.isArray(object.material)
          ? object.material
          : [object.material])
          resources.add(item)
      }
    })
    for (const resource of resources) resource.dispose()
    for (const texture of textures) texture.dispose()
    environment.dispose()
    light.shadow.dispose()
    renderer.dispose()
    renderer.domElement.remove()
  }
  return {
    press: (code: string) => {
      // Retain sub-frame taps even when React batches their down/up attributes.
      const key = capByCode.get(code)
      if (!key) return
      key.pendingPress = true
      wake()
    },
    dispose,
  }
}
