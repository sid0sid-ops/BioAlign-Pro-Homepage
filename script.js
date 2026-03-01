// Theme Toggle Logic
function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeIcon(isDark);
    updateThreeJsColors(isDark);
}

function updateThemeIcon(isDark) {
    const icon = document.getElementById('themeIcon');
    if (icon) {
        if (isDark) {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        } else {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        }
    }
}

// Global Three.js variables
let scene, camera, renderer, particles, linesMesh;
let particleMaterial, lineMaterial;

// 3D Background System using Three.js
function initThreeJsBackground() {
    const container = document.getElementById('threejs-canvas');
    if (!container) return;

    // Determine Theme
    const isDark = document.documentElement.classList.contains('dark');

    // 1. Scene, Camera, Renderer
    scene = new THREE.Scene();

    // Better depth perception with perspective camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 100;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // 2. Complex Biological Particle System (Nodes connecting like neural/cellular networks)
    const particleCount = 200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];

    const range = 200; // Spread of particles

    for (let i = 0; i < particleCount; i++) {
        // Random positions inside a sphere/box
        positions[i * 3] = (Math.random() - 0.5) * range;
        positions[i * 3 + 1] = (Math.random() - 0.5) * range;
        positions[i * 3 + 2] = (Math.random() - 0.5) * range;

        // Slow random velocities
        velocities.push({
            x: (Math.random() - 0.5) * 0.2,
            y: (Math.random() - 0.5) * 0.2,
            z: (Math.random() - 0.5) * 0.2
        });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Custom properties to animate them inside the render loop
    geometry.userData = { velocities: velocities };

    // Materials - adaptive to dark/light theme
    const nodeColor = isDark ? 0x10b981 : 0x000000; // Emerald in dark, Black in light
    const lineColor = isDark ? 0x3ea6ff : 0x3ea6ff; // Primary Blue

    particleMaterial = new THREE.PointsMaterial({
        color: nodeColor,
        size: 1.5,
        transparent: true,
        opacity: 0.8
    });

    particles = new THREE.Points(geometry, particleMaterial);
    scene.add(particles);

    // Dynamic Connections (Lines)
    lineMaterial = new THREE.LineBasicMaterial({
        color: lineColor,
        transparent: true,
        opacity: 0.15
    });

    // Allocate a large enough buffer for the lines (e.g. max possible connections)
    // To save memory we assume a reasonable max count
    const maxLineCount = 1500;
    const linePositions = new Float32Array(maxLineCount * 6); // 2 vertices per line, 3 coords each
    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));

    linesMesh = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(linesMesh);

    // Initial color setup
    updateThreeJsColors(isDark);

    // Handle Window Resize
    window.addEventListener('resize', onWindowResize, false);

    // Slow camera panning based on mouse
    let mouseX = 0;
    let mouseY = 0;
    document.addEventListener('mousemove', (event) => {
        mouseX = (event.clientX - window.innerWidth / 2) * 0.05;
        mouseY = (event.clientY - window.innerHeight / 2) * 0.05;
    });

    // 3. Animation Loop
    function animate() {
        requestAnimationFrame(animate);

        // Gentle camera float based on mouse
        camera.position.x += (mouseX - camera.position.x) * 0.05;
        camera.position.y += (-mouseY - camera.position.y) * 0.05;
        camera.lookAt(scene.position);

        // Move Particles
        const positions = particles.geometry.attributes.position.array;
        const velocities = particles.geometry.userData.velocities;
        const vertexCount = particleCount;

        for (let i = 0; i < vertexCount; i++) {
            positions[i * 3] += velocities[i].x;
            positions[i * 3 + 1] += velocities[i].y;
            positions[i * 3 + 2] += velocities[i].z;

            // Bounce off invisible boundaries to keep them on screen
            if (Math.abs(positions[i * 3]) > range / 2) velocities[i].x *= -1;
            if (Math.abs(positions[i * 3 + 1]) > range / 2) velocities[i].y *= -1;
            if (Math.abs(positions[i * 3 + 2]) > range / 2) velocities[i].z *= -1;
        }

        particles.geometry.attributes.position.needsUpdate = true;

        // Draw Lines between close particles (The "Network" effect)
        let lineIdx = 0;
        const linePositions = linesMesh.geometry.attributes.position.array;
        const connectionDistance = 30; // Max distance to draw a line

        for (let i = 0; i < vertexCount; i++) {
            for (let j = i + 1; j < vertexCount; j++) {
                const dx = positions[i * 3] - positions[j * 3];
                const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
                const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
                const distSquared = dx * dx + dy * dy + dz * dz;

                if (distSquared < connectionDistance * connectionDistance) {
                    // Update only if we have room in the buffer
                    if (lineIdx < linePositions.length / 3) {
                        linePositions[lineIdx * 3] = positions[i * 3];
                        linePositions[lineIdx * 3 + 1] = positions[i * 3 + 1];
                        linePositions[lineIdx * 3 + 2] = positions[i * 3 + 2];
                        lineIdx++;

                        linePositions[lineIdx * 3] = positions[j * 3];
                        linePositions[lineIdx * 3 + 1] = positions[j * 3 + 1];
                        linePositions[lineIdx * 3 + 2] = positions[j * 3 + 2];
                        lineIdx++;
                    }
                }
            }
        }

        // Hide remaining lines in the buffer
        for (let i = lineIdx; i < linePositions.length / 3; i++) {
            linePositions[i * 3] = 0;
            linePositions[i * 3 + 1] = 0;
            linePositions[i * 3 + 2] = 0;
        }

        linesMesh.geometry.setDrawRange(0, lineIdx);
        linesMesh.geometry.attributes.position.needsUpdate = true;

        // Very slow overall rotation
        scene.rotation.y += 0.001;
        scene.rotation.x += 0.0005;

        renderer.render(scene, camera);
    }

    animate();
}

function onWindowResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Helper to update colors without reloading the canvas
function updateThreeJsColors(isDark) {
    if (!particleMaterial || !lineMaterial) return;

    if (isDark) {
        particleMaterial.color.setHex(0x10b981); // Emerald
        lineMaterial.color.setHex(0x3ea6ff); // Blue
        lineMaterial.opacity = 0.15;
    } else {
        particleMaterial.color.setHex(0x333333); // Dark Gray
        lineMaterial.color.setHex(0x000000); // Black
        lineMaterial.opacity = 0.08;
    }
}


// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    const isDark = document.documentElement.classList.contains('dark');
    updateThemeIcon(isDark);

    // Start the 3D Scientific Background
    initThreeJsBackground();
});
