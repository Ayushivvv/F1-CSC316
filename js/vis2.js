//
// === UPDATED VERSION: js/vis2.js (Fixed Shared Material Highlighting) ===
//

// 1. Import Three.js and Addons using the Import Map
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

document.addEventListener("DOMContentLoaded", function () {
    // Check if we are on the main page and viz2 exists
    if (!document.getElementById("viz2")) {
        return;
    }

    viz2(); // Initialize the visualization

    function viz2() {
        // --- 3D Model Path ---
        const MODEL_PATH = "images/car.glb";

        // --- DOM Selections ---
        const carContainer = document.getElementById("carContainer");
        const modal = d3.select("#viz2-modal");
        const modalTitle = d3.select("#modal-title");
        const modalChart = d3.select("#modal-chart");
        const modalOvertakes = d3.select("#modal-overtakes");
        const modalDescription = d3.select("#modal-description");

        const modalCloseBtn = modal.select(".close-btn");

        // --- TOOLTIP CREATION ---
        const tooltip = d3.select("body").append("div")
            .attr("class", "viz2-d3-tooltip")
            .style("position", "absolute")
            .style("background", "rgba(0, 0, 0, 0.8)")
            .style("color", "#fff")
            .style("padding", "6px 10px")
            .style("border-radius", "4px")
            .style("font-size", "12px")
            .style("pointer-events", "none")
            .style("display", "none")
            .style("z-index", "9999")
            .style("font-family", "sans-serif");

        // --- Three.js Variables ---
        let scene, camera, renderer, controls, carModel;
        let raycaster, mouse;
        let containerWidth, containerHeight;
        let animationId;

        let INTERSECTED = null;

        // --- Initialization ---
        initThreeJS();

        // --- Event Listeners ---
        modalCloseBtn.on("click", closeModal);
        window.addEventListener('resize', onWindowResize, false);

        // --- Three.js Logic ---
        function initThreeJS() {
            // 1. Setup Scene
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0xf9f5f0); // Match CSS --cream

            // 2. Setup Camera
            containerWidth = carContainer.clientWidth;
            containerHeight = 400; // Fixed height

            camera = new THREE.PerspectiveCamera(40, containerWidth / containerHeight, 0.1, 1000);
            camera.position.set(4, 2, 5); // Angle looking down at the car

            // 3. Setup Renderer
            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setSize(containerWidth, containerHeight);
            renderer.shadowMap.enabled = true;
            renderer.outputColorSpace = THREE.SRGBColorSpace;

            carContainer.innerHTML = ""; // Clear existing content
            carContainer.appendChild(renderer.domElement);

            // 4. Lights
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
            scene.add(ambientLight);

            const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
            dirLight.position.set(5, 10, 7.5);
            dirLight.castShadow = true;
            scene.add(dirLight);

            const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
            dirLight2.position.set(-5, 5, -5);
            scene.add(dirLight2);

            // 5. Controls
            if (OrbitControls) {
                controls = new OrbitControls(camera, renderer.domElement);
                controls.enableDamping = true;
                controls.dampingFactor = 0.05;
                controls.minDistance = 2;
                controls.maxDistance = 15;
                controls.enablePan = false;
            }

            // 6. Load 3D Model
            const loader = new GLTFLoader();

            // Show loading text temporarily
            const loadingDiv = document.createElement("div");
            loadingDiv.innerText = "Loading 3D Car...";
            loadingDiv.style.position = "absolute";
            loadingDiv.style.color = "#d40000";
            loadingDiv.style.fontWeight = "bold";
            carContainer.appendChild(loadingDiv);

            loader.load(MODEL_PATH, function (gltf) {
                if (loadingDiv) loadingDiv.remove();

                carModel = gltf.scene;

                // Auto-center and scale
                const box = new THREE.Box3().setFromObject(carModel);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());

                // Center the model
                carModel.position.x += (carModel.position.x - center.x);
                carModel.position.y += (carModel.position.y - center.y);
                carModel.position.z += (carModel.position.z - center.z);

                // Scale it nicely to fit view
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = 3.5 / maxDim;
                carModel.scale.set(scale, scale, scale);

                // Add shadows and CLONE MATERIALS to prevent shared-material highlighting issues
                carModel.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;

                        // FIX: Clone the material so each part is unique.
                        // This prevents Object_292 from lighting up when you hover the Doors.
                        if (child.material) {
                            child.material = child.material.clone();
                        }
                    }
                });

                scene.add(carModel);
                animate();
                console.log("3D Car Loaded Successfully");

            }, undefined, function (error) {
                console.error('An error happened loading the GLB:', error);
                if (loadingDiv) loadingDiv.innerText = "Error loading 3D Model.";
            });

            // 7. Raycaster for Interactions
            raycaster = new THREE.Raycaster();
            mouse = new THREE.Vector2();

            renderer.domElement.addEventListener('mousemove', onMouseMove);
            renderer.domElement.addEventListener('click', onMouseClick);
        }

        // --- Interaction Logic ---
        function getPartCategory(object) {
            let curr = object;
            while(curr) {
                const n = curr.name.toLowerCase();

                // 1. TIRES
                if (n.includes("tire") || n.includes("wheel") || n.includes("rim") || n.includes("brake")) return "tires";

                // 2. DOORS / SIDEPODS
                // Explicitly added 'object_234' and 'geo_door' to catch that specific part
                if (n.includes("door") || n.includes("sidepod") || n.includes("intake") || n.includes("geo_door") || n.includes("object_234")) return "doors";

                // 3. TAIL / REAR WING
                if (n.includes("sub1") || n.includes("sub5")) return "wing";

                // 4. FRONT HOOD / NOSE / CHASSIS
                if (n.includes("body") || n.includes("chassis") || n.includes("exterior") || n.includes("nose") || n.includes("front") || n.includes("hood") || n.includes("monocoque") || n.includes("halo") || n.includes("cockpit") || n.includes("radiator")) return "hood";

                curr = curr.parent;
            }
            return null;
        }

        function onMouseMove(event) {
            if (!carModel) return;

            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(carModel.children, true);

            if (intersects.length > 0) {
                const object = intersects[0].object;
                const category = getPartCategory(object);

                if (category) {
                    if (INTERSECTED !== object) {
                        if (INTERSECTED) {
                            if (INTERSECTED.material && INTERSECTED.material.emissive) {
                                INTERSECTED.material.emissive.setHex(INTERSECTED.currentHex);
                            }
                        }
                        INTERSECTED = object;
                        if (INTERSECTED.material && INTERSECTED.material.emissive) {
                            INTERSECTED.currentHex = INTERSECTED.material.emissive.getHex();
                            INTERSECTED.material.emissive.setHex(0x554400); // Yellow glow
                        }
                    }

                    if (category === "tires") {
                        showTooltipRaw(event, "Tires: Click for Pit Stop Analysis");
                        document.body.style.cursor = 'pointer';
                    } else if (category === "hood") {
                        showTooltipRaw(event, "Nose/Body: Click for Lap Time Performance");
                        document.body.style.cursor = 'pointer';
                    } else if (category === "wing") {
                        showTooltipRaw(event, "Rear: Click for Race Position");
                        document.body.style.cursor = 'pointer';
                    } else if (category === "doors") {
                        showTooltipRaw(event, "Sidepods: Click for Aerodynamics");
                        document.body.style.cursor = 'pointer';
                    }
                } else {
                    if (INTERSECTED) {
                        if (INTERSECTED.material && INTERSECTED.material.emissive) {
                            INTERSECTED.material.emissive.setHex(INTERSECTED.currentHex);
                        }
                    }
                    INTERSECTED = null;
                    hideTooltip();
                    document.body.style.cursor = 'default';
                }
            } else {
                if (INTERSECTED) {
                    if (INTERSECTED.material && INTERSECTED.material.emissive) {
                        INTERSECTED.material.emissive.setHex(INTERSECTED.currentHex);
                    }
                }
                INTERSECTED = null;
                hideTooltip();
                document.body.style.cursor = 'default';
            }
        }

        function onMouseClick(event) {
            if (!carModel) return;
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(carModel.children, true);

            if (intersects.length > 0) {
                // --- DEBUGGING LOG ---
                console.log("--- Click Debug ---");
                console.log("Clicked Part Name:", intersects[0].object.name);
                let p = intersects[0].object.parent;
                while(p) {
                    console.log("Parent Name:", p.name);
                    p = p.parent;
                }
                // ---------------------

                const category = getPartCategory(intersects[0].object);
                if (category === "tires") showPitstopData();
                else if (category === "hood") showLapTimeData();
                else if (category === "wing") showPositionData();
                else if (category === "doors") showDummyData();
            }
        }

        function onWindowResize() {
            if (!camera || !renderer) return;
            containerWidth = carContainer.clientWidth;
            camera.aspect = containerWidth / containerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(containerWidth, containerHeight);
        }

        function animate() {
            animationId = requestAnimationFrame(animate);
            if (controls) controls.update();
            renderer.render(scene, camera);
        }

        // --- Visualization Trigger Functions (DUMMY) ---

        function showCommonDummy(title, subtitle) {
            openModal(title);
            clearModal();
            modalDescription.html(subtitle);
            modalChart.html(`<div style="text-align:center; padding: 2rem;"><h3 style="color:var(--red);">Feature Coming Soon</h3><p>Collecting data analysis...</p></div>`);
        }

        function showPitstopData() {
            showCommonDummy("Pit Stop Analysis", "Detailed pit stop durations vs race position.");
        }

        function showLapTimeData() {
            showCommonDummy("Lap Time Performance", "This chart plots the raw lap time (ms) for each lap.");
        }

        function showPositionData() {
            showCommonDummy("Race Position", "Track the driver's position at the end of every lap.");
        }

        function showDummyData() {
            showCommonDummy("Aerodynamics", "Detailed aerodynamic flow analysis for the side-pods and doors.");
        }

        // --- Utility ---
        function showTooltipRaw(event, text) { tooltip.text(text).style("display", "block").style("left", (event.pageX+15)+"px").style("top", (event.pageY-15)+"px"); }
        function hideTooltip() { tooltip.style("display", "none"); }
        function openModal(title) { modalTitle.text(title); modal.style("display", "block"); clearModal(); modalChart.html("<p>Loading...</p>"); }
        function closeModal() { modal.style("display", "none"); clearModal(); }
        function clearModal() { modalChart.html(""); modalOvertakes.html(""); modalDescription.html(""); }
    }
});