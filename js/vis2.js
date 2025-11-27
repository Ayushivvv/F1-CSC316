//
// === UPDATED VERSION: js/vis2.js (Axis Labels Added) ===
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

        // ==========================================
        // === HARDCODED DATA (Updated 2025) ===
        // ==========================================

        // 1. TYRE WAR DATA (Extended 2001-2023)
        const tyreData = [
            {"year": 2001, "mfr": "Bridgestone", "avg_position": 5.98}, {"year": 2001, "mfr": "Michelin", "avg_position": 9.34},
            {"year": 2002, "mfr": "Bridgestone", "avg_position": 6.48}, {"year": 2002, "mfr": "Michelin", "avg_position": 7.3},
            {"year": 2003, "mfr": "Bridgestone", "avg_position": 8.6}, {"year": 2003, "mfr": "Michelin", "avg_position": 6.16},
            {"year": 2004, "mfr": "Bridgestone", "avg_position": 8.73}, {"year": 2004, "mfr": "Michelin", "avg_position": 7.5},
            {"year": 2005, "mfr": "Bridgestone", "avg_position": 11.03}, {"year": 2005, "mfr": "Michelin", "avg_position": 6.97},
            {"year": 2006, "mfr": "Bridgestone", "avg_position": 9.34}, {"year": 2006, "mfr": "Michelin", "avg_position": 7.6},
            {"year": 2007, "mfr": "Bridgestone", "avg_position": 8.93}, {"year": 2008, "mfr": "Bridgestone", "avg_position": 8.72},
            {"year": 2009, "mfr": "Bridgestone", "avg_position": 8.8}, {"year": 2010, "mfr": "Bridgestone", "avg_position": 9.79},
            {"year": 2011, "mfr": "Pirelli", "avg_position": 10.5}, {"year": 2012, "mfr": "Pirelli", "avg_position": 10.64},
            {"year": 2013, "mfr": "Pirelli", "avg_position": 10.17}, {"year": 2014, "mfr": "Pirelli", "avg_position": 9.25},
            {"year": 2015, "mfr": "Pirelli", "avg_position": 8.66}, {"year": 2016, "mfr": "Pirelli", "avg_position": 9.73},
            {"year": 2017, "mfr": "Pirelli", "avg_position": 8.43}, {"year": 2018, "mfr": "Pirelli", "avg_position": 8.78},
            {"year": 2019, "mfr": "Pirelli", "avg_position": 9.41}, {"year": 2020, "mfr": "Pirelli", "avg_position": 9.07},
            {"year": 2021, "mfr": "Pirelli", "avg_position": 9.45}, {"year": 2022, "mfr": "Pirelli", "avg_position": 9.12},
            {"year": 2023, "mfr": "Pirelli", "avg_position": 9.39}
        ];

        // 2. ENGINE EVOLUTION DATA (Points by Type)
        const engineData = [
            {"year": 1995, "type": "V10", "points": 345.0}, {"year": 1996, "type": "V10", "points": 415.0},
            {"year": 1997, "type": "V10", "points": 693.0}, {"year": 1998, "type": "V10", "points": 416.0},
            {"year": 1999, "type": "V10", "points": 417.0}, {"year": 2000, "type": "V10", "points": 442.0},
            {"year": 2001, "type": "V10", "points": 442.0}, {"year": 2002, "type": "V10", "points": 671.0},
            {"year": 2003, "type": "V10", "points": 924.0}, {"year": 2004, "type": "V10", "points": 702.0},
            {"year": 2005, "type": "V10", "points": 845.0}, {"year": 2006, "type": "V8", "points": 701.0},
            {"year": 2007, "type": "V8", "points": 663.0}, {"year": 2008, "type": "V8", "points": 702.0},
            {"year": 2009, "type": "V8", "points": 643.5}, {"year": 2010, "type": "V8", "points": 1919.0},
            {"year": 2011, "type": "V8", "points": 1919.0}, {"year": 2012, "type": "V8", "points": 2020.0},
            {"year": 2013, "type": "V8", "points": 1919.0}, {"year": 2014, "type": "V6 Hybrid", "points": 2020.0},
            {"year": 2015, "type": "V6 Hybrid", "points": 1919.0}, {"year": 2016, "type": "V6 Hybrid", "points": 2121.0},
            {"year": 2017, "type": "V6 Hybrid", "points": 2020.0}, {"year": 2018, "type": "V6 Hybrid", "points": 2232.0},
            {"year": 2019, "type": "V6 Hybrid", "points": 2140.0}, {"year": 2020, "type": "V6 Hybrid", "points": 1734.0},
            {"year": 2021, "type": "V6 Hybrid", "points": 2189.5}, {"year": 2022, "type": "V6 Hybrid", "points": 2242.0},
            {"year": 2023, "type": "V6 Hybrid", "points": 2242.0}
        ];

        // 3. RELIABILITY DATA (Fast but Fragile)
        const reliabilityData = [
            {"label": "Mercedes 2015", "avg_grid": 1.8, "reliability": 97.4},
            {"label": "Mercedes 2020", "avg_grid": 2.1, "reliability": 100.0},
            {"label": "Ferrari 2002", "avg_grid": 2.4, "reliability": 91.2},
            {"label": "Red Bull 2010", "avg_grid": 2.4, "reliability": 94.7},
            {"label": "Mercedes 2014", "avg_grid": 2.4, "reliability": 94.7},
            {"label": "Red Bull 2011", "avg_grid": 2.5, "reliability": 100.0},
            {"label": "McLaren 2000", "avg_grid": 2.6, "reliability": 91.2},
            {"label": "McLaren 2007", "avg_grid": 2.9, "reliability": 100.0},
            {"label": "Mercedes 2019", "avg_grid": 3.0, "reliability": 100.0},
            {"label": "Mercedes 2016", "avg_grid": 3.0, "reliability": 97.6},
            {"label": "Mercedes 2017", "avg_grid": 3.1, "reliability": 97.5},
            {"label": "Ferrari 2001", "avg_grid": 3.1, "reliability": 91.2},
            {"label": "Williams 2002", "avg_grid": 3.2, "reliability": 85.3},
            {"label": "Red Bull 2013", "avg_grid": 3.2, "reliability": 94.7},
            {"label": "Ferrari 2018", "avg_grid": 3.3, "reliability": 100.0},
            {"label": "Mercedes 2018", "avg_grid": 3.4, "reliability": 97.6},
            {"label": "Ferrari 2000", "avg_grid": 3.4, "reliability": 88.2},
            {"label": "Ferrari 2017", "avg_grid": 3.5, "reliability": 100.0},
            {"label": "Ferrari 2008", "avg_grid": 3.7, "reliability": 88.9},
            {"label": "Ferrari 2004", "avg_grid": 3.8, "reliability": 100.0},
            {"label": "Ferrari 2003", "avg_grid": 3.9, "reliability": 96.9},
            {"label": "Mercedes 2013", "avg_grid": 3.9, "reliability": 92.1},
            {"label": "Ferrari 2007", "avg_grid": 3.9, "reliability": 91.2},
            {"label": "Red Bull 2021", "avg_grid": 4.0, "reliability": 100.0},
            {"label": "McLaren 2011", "avg_grid": 4.0, "reliability": 94.7},
            {"label": "Prost 2000", "avg_grid": 16.9, "reliability": 55.9},
            {"label": "Minardi 2001", "avg_grid": 20.5, "reliability": 58.8},
            {"label": "BAR 2002", "avg_grid": 12.7, "reliability": 61.8},
            {"label": "Arrows 2000", "avg_grid": 13.9, "reliability": 64.7},
            {"label": "Jordan 2003", "avg_grid": 15.3, "reliability": 65.6},
            {"label": "Jaguar 2003", "avg_grid": 11.5, "reliability": 65.6},
            {"label": "BAR 2003", "avg_grid": 11.5, "reliability": 65.6},
            {"label": "Jordan 2000", "avg_grid": 7.7, "reliability": 67.6},
            {"label": "Jaguar 2002", "avg_grid": 15.9, "reliability": 67.6},
            {"label": "Williams 2001", "avg_grid": 4.4, "reliability": 67.6},
            {"label": "Toyota 2002", "avg_grid": 14.5, "reliability": 70.6},
            {"label": "Renault 2002", "avg_grid": 9.5, "reliability": 70.6},
            {"label": "Williams 2000", "avg_grid": 10.1, "reliability": 70.6},
            {"label": "McLaren 2001", "avg_grid": 4.6, "reliability": 70.6},
            {"label": "Arrows 2002", "avg_grid": 15.6, "reliability": 70.8}
        ];

        // 4. WORKS VS CUSTOMER DATA (Points Per Race)
        const worksData = [
            {"year": 2014, "type": "Customer", "pts": 4.59}, {"year": 2014, "type": "Works", "pts": 23.2},
            {"year": 2015, "type": "Customer", "pts": 4.51}, {"year": 2015, "type": "Works", "pts": 23.1},
            {"year": 2016, "type": "Customer", "pts": 3.27}, {"year": 2016, "type": "Works", "pts": 19.52},
            {"year": 2017, "type": "Customer", "pts": 3.54}, {"year": 2017, "type": "Works", "pts": 16.66},
            {"year": 2018, "type": "Customer", "pts": 2.82}, {"year": 2018, "type": "Works", "pts": 21.05},
            {"year": 2019, "type": "Customer", "pts": 3.07}, {"year": 2019, "type": "Works", "pts": 20.85},
            {"year": 2020, "type": "Customer", "pts": 5.22}, {"year": 2020, "type": "Works", "pts": 17.7},
            {"year": 2021, "type": "Customer", "pts": 4.02}, {"year": 2021, "type": "Works", "pts": 18.88},
            {"year": 2022, "type": "Customer", "pts": 2.53}, {"year": 2022, "type": "Works", "pts": 21.68},
            {"year": 2023, "type": "Customer", "pts": 4.58}, {"year": 2023, "type": "Works", "pts": 18.6}
        ];

        // ==========================================

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

        // --- Group Highlight Variables ---
        let HIGHLIGHTED_OBJS = []; // Stores all currently lit objects
        let CURRENT_CATEGORY = null; // Stores the active category (e.g., "tires")

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

                // Clone materials for independent highlighting
                carModel.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
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

                // 1. ENGINE (Specific ID)
                if (n.includes("object_5")) return "engine";

                // 2. FRONT WING (Specific ID)
                if (n.includes("object_4")) return "front_wing";

                // 3. TIRES (Keywords + Specific IDs)
                if (n.includes("tire") || n.includes("wheel") || n.includes("rim") || n.includes("brake") ||
                    n.includes("object_6") || n.includes("object_7") || n.includes("object_8")) return "tires";

                // 4. NOSE/BODY (Keywords)
                if (n.includes("body") || n.includes("chassis") || n.includes("exterior") || n.includes("nose") || n.includes("front") || n.includes("hood") || n.includes("monocoque") || n.includes("halo") || n.includes("cockpit") || n.includes("radiator")) return "hood";

                curr = curr.parent;
            }
            return null;
        }

        // Helper to restore original color of all currently highlighted items
        function restoreHighlight() {
            if (HIGHLIGHTED_OBJS.length > 0) {
                HIGHLIGHTED_OBJS.forEach(obj => {
                    if (obj.material && obj.material.emissive) {
                        obj.material.emissive.setHex(obj.currentHex);
                    }
                });
                HIGHLIGHTED_OBJS = [];
            }
            CURRENT_CATEGORY = null;
        }

        function onMouseMove(event) {
            // Check if modal is active
            if (modal.style("display") === "block") {
                hideTooltip();
                restoreHighlight();
                document.body.style.cursor = 'default';
                return;
            }

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
                    // Check if we have moved to a NEW category (or entered one)
                    if (CURRENT_CATEGORY !== category) {
                        restoreHighlight(); // Clear previous highlights
                        CURRENT_CATEGORY = category; // Set new active category

                        // Search the WHOLE car for parts matching this category
                        carModel.traverse((child) => {
                            if (child.isMesh) {
                                const childCat = getPartCategory(child);
                                if (childCat === category) {
                                    // Highlight this part
                                    if (child.material && child.material.emissive) {
                                        child.currentHex = child.material.emissive.getHex();
                                        child.material.emissive.setHex(0x554400); // Yellow highlight
                                        HIGHLIGHTED_OBJS.push(child);
                                    }
                                }
                            }
                        });
                    }

                    // Show Tooltip
                    if (category === "tires") {
                        showTooltipRaw(event, "Tires: The Tyre War Era");
                    } else if (category === "hood") {
                        showTooltipRaw(event, "Body: Works vs Customer Teams");
                    } else if (category === "engine") {
                        showTooltipRaw(event, "Engine: Power Unit Evolution");
                    } else if (category === "front_wing") {
                        showTooltipRaw(event, "Wing: Fast but Fragile Audit");
                    }
                    document.body.style.cursor = 'pointer';

                } else {
                    restoreHighlight();
                    hideTooltip();
                    document.body.style.cursor = 'default';
                }
            } else {
                restoreHighlight();
                hideTooltip();
                document.body.style.cursor = 'default';
            }
        }

        function onMouseClick(event) {
            if (!carModel) return;
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(carModel.children, true);

            if (intersects.length > 0) {
                const category = getPartCategory(intersects[0].object);
                // Map Categories to new Data Functions
                if (category === "tires") showPitstopData(); // Now Tyre War
                else if (category === "hood") showLapTimeData(); // Now Works vs Customer
                else if (category === "engine") showEngineData(); // Now Engine Evo
                else if (category === "front_wing") showFrontWingData(); // Now Reliability
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

        // --- NEW VISUALIZATION FUNCTIONS (With Background Info) ---

        // 1. TIRES -> Tyre War Analysis
        function showPitstopData() {
            openModal("The 'Tyre War' Era (2001-2023)");
            modalDescription.html(`
                <p style="font-size: 14px; font-weight: 500; line-height: 1.6; margin-bottom: 1rem; color: #333;">
                    During the early 2000s, F1 featured a fierce battle between two tyre manufacturers: 
                    <strong>Bridgestone</strong> (who worked closely with Ferrari) and <strong>Michelin</strong> 
                    (who supplied McLaren, Renault, and others). This competition led to rapid lap time improvements 
                    but also created disparities where certain teams dominated depending on the tyre compound suited 
                    to the track. In 2007, Bridgestone became the sole supplier, followed by Pirelli in 2011, 
                    standardizing the field. This chart compares the <strong>average finishing position</strong> of cars on 
                    different rubber.
                </p>
                <p style="color: #333;">Lower value = Better Performance.</p>
            `);

            const margin = {top: 20, right: 80, bottom: 40, left: 50}, width = 600 - margin.left - margin.right, height = 300 - margin.top - margin.bottom;
            const svg = modalChart.append("svg").attr("width", width + margin.left + margin.right).attr("height", height + margin.top + margin.bottom).append("g").attr("transform", `translate(${margin.left},${margin.top})`);

            const x = d3.scaleLinear().domain([2001, 2023]).range([0, width]);
            const y = d3.scaleLinear().domain([12, 4]).range([height, 0]); // Inverted Y

            svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).tickFormat(d3.format("d")));
            svg.append("g").call(d3.axisLeft(y));

            // Axis Labels
            svg.append("text").attr("transform", "rotate(-90)").attr("y", 0 - margin.left).attr("x", 0 - (height / 2)).attr("dy", "1em").style("text-anchor", "middle").style("fill", "#ccc").text("Average Finishing Position");
            svg.append("text").attr("transform", `translate(${width/2}, ${height + margin.top + 10})`).style("text-anchor", "middle").style("fill", "#ccc").text("Year");

            const groups = d3.group(tyreData, d => d.mfr);
            const color = d3.scaleOrdinal().domain(["Bridgestone", "Michelin", "Pirelli"]).range(["#e10600", "#003399", "#F2C744"]);

            groups.forEach((values, key) => {
                svg.append("path")
                    .datum(values)
                    .attr("fill", "none").attr("stroke", color(key)).attr("stroke-width", 3)
                    .attr("d", d3.line().x(d => x(d.year)).y(d => y(d.avg_position)));

                svg.append("text").attr("x", x(2023) + 5).attr("y", y(values[values.length-1].avg_position)).text(key).style("fill", color(key)).style("font-size", "12px").style("font-weight", "bold");
            });
        }

        // 2. NOSE/BODY -> Works vs Customer
        function showLapTimeData() {
            openModal("Customer vs. Works Teams");
            modalDescription.html(`
                <p style="font-size: 14px; font-weight: 500; line-height: 1.6; margin-bottom: 1rem; color: #333;">
                    In modern F1, teams are divided into two categories: <strong>Works Teams</strong> 
                    (like Mercedes, Ferrari, Alpine) who manufacture their own engines and chassis, and 
                    <strong>Customer Teams</strong> (like Williams, Haas) who purchase engines from suppliers. 
                    In the complex <strong>Hybrid Era (2014-Present)</strong>, Works teams have a massive advantage 
                    because they can perfectly integrate the Power Unit into the chassis design. 
                    This chart shows the significant gap in <strong>average points per race</strong> between them.
                </p>
            `);

            const margin = {top: 20, right: 80, bottom: 40, left: 50}, width = 600 - margin.left - margin.right, height = 300 - margin.top - margin.bottom;
            const svg = modalChart.append("svg").attr("width", width + margin.left + margin.right).attr("height", height + margin.top + margin.bottom).append("g").attr("transform", `translate(${margin.left},${margin.top})`);

            const x = d3.scaleLinear().domain([2014, 2023]).range([0, width]);
            const y = d3.scaleLinear().domain([0, 25]).range([height, 0]);

            svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).tickFormat(d3.format("d")));
            svg.append("g").call(d3.axisLeft(y));

            // Axis Labels
            svg.append("text").attr("transform", "rotate(-90)").attr("y", 0 - margin.left).attr("x", 0 - (height / 2)).attr("dy", "1em").style("text-anchor", "middle").style("fill", "#ccc").text("Points Per Race");
            svg.append("text").attr("transform", `translate(${width/2}, ${height + margin.top + 10})`).style("text-anchor", "middle").style("fill", "#ccc").text("Year");

            const groups = d3.group(worksData, d => d.type);
            const color = d3.scaleOrdinal().domain(["Works", "Customer"]).range(["#9b59b6", "#3498db"]);

            groups.forEach((values, key) => {
                svg.append("path").datum(values).attr("fill", "none").attr("stroke", color(key)).attr("stroke-width", 3)
                    .attr("d", d3.line().x(d => x(d.year)).y(d => y(d.pts)));

                svg.append("text").attr("x", x(2023) + 5).attr("y", y(values[values.length-1].pts)).text(key).style("fill", color(key)).style("font-size", "12px").style("font-weight", "bold");
            });
        }

        // 3. ENGINE -> Power Unit Evolution
        function showEngineData() {
            openModal("Power Unit Evolution");
            modalDescription.html(`
                <p style="font-size: 14px; font-weight: 500; line-height: 1.6; margin-bottom: 1rem; color: #333;">
                    F1 engine regulations have shifted dramatically to reflect global trends. 
                    The screaming <strong>V10s (1990s-2005)</strong> were powerful but fuel-thirsty. 
                    They were replaced by <strong>V8s (2006-2013)</strong> to cut costs. 
                    In 2014, the sport introduced the <strong>V6 Hybrid Turbo</strong> power units, 
                    which are the most efficient engines in the world. This visualization tracks the 
                    <strong>total points scored</strong> by each engine configuration, highlighting the dominance of the V6 Hybrid era.
                </p>
            `);

            const margin = {top: 20, right: 30, bottom: 40, left: 60}, width = 600 - margin.left - margin.right, height = 300 - margin.top - margin.bottom;
            const svg = modalChart.append("svg").attr("width", width + margin.left + margin.right).attr("height", height + margin.top + margin.bottom).append("g").attr("transform", `translate(${margin.left},${margin.top})`);

            const years = [...new Set(engineData.map(d => d.year))];
            const x = d3.scaleBand().domain(years).range([0, width]).padding(0.1);
            const y = d3.scaleLinear().domain([0, 2500]).range([height, 0]);
            const color = d3.scaleOrdinal().domain(["V10", "V8", "V6 Hybrid"]).range(["#ffcc00", "#ff6600", "#00ccff"]);

            svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).tickValues([1995, 2000, 2005, 2010, 2015, 2020, 2023]));
            svg.append("g").call(d3.axisLeft(y));

            // Axis Labels
            svg.append("text").attr("transform", "rotate(-90)").attr("y", 0 - margin.left).attr("x", 0 - (height / 2)).attr("dy", "1em").style("text-anchor", "middle").style("fill", "#ccc").text("Total Points Scored");
            svg.append("text").attr("transform", `translate(${width/2}, ${height + margin.top + 10})`).style("text-anchor", "middle").style("fill", "#ccc").text("Year");

            svg.selectAll("rect").data(engineData).enter().append("rect")
                .attr("x", d => x(d.year))
                .attr("y", d => y(d.points))
                .attr("width", x.bandwidth())
                .attr("height", d => height - y(d.points))
                .attr("fill", d => color(d.type))
                .attr("opacity", 0.9)
                .on("mouseover", (e, d) => showTooltipRaw(e, `${d.type}: ${d.points} pts`))
                .on("mouseout", hideTooltip);

            // Legend
            ["V10", "V8", "V6 Hybrid"].forEach((k, i) => {
                svg.append("rect").attr("x", 20).attr("y", i*20).attr("width", 10).attr("height", 10).attr("fill", color(k));
                svg.append("text").attr("x", 35).attr("y", i*20 + 9).text(k).style("font-size", "12px").style("fill", "#333");
            });
        }

        // 4. FRONT WING -> Reliability Audit
        function showFrontWingData() {
            openModal("'Fast but Fragile': Reliability Audit");
            modalDescription.html(`
                <p style="font-size: 14px; font-weight: 500; line-height: 1.6; margin-bottom: 1rem; color: #333;">
                    In Formula 1, speed is nothing without reliability. The term <strong>"Glass Cannon"</strong> 
                    refers to a car that is incredibly fast (qualifies high) but frequently breaks down due to 
                    mechanical failures. This scatter plot analyzes teams based on 
                    <strong>Speed (Avg Grid Position)</strong> vs. <strong>Reliability (Mechanical Finish %)</strong>.
                    <br><br>
                    <span style='color:#44ff44'>● Top Left: Fast & Reliable (The Goal)</span><br>
                    <span style='color:#ff4444'>● Bottom Left: Fast but Fragile (Glass Cannons)</span>
                </p>
            `);

            const margin = {top: 20, right: 30, bottom: 40, left: 50}, width = 600 - margin.left - margin.right, height = 300 - margin.top - margin.bottom;
            const svg = modalChart.append("svg").attr("width", width + margin.left + margin.right).attr("height", height + margin.top + margin.bottom).append("g").attr("transform", `translate(${margin.left},${margin.top})`);

            // X Axis: 22 (Slow) to 1 (Fast/Pole) - UPDATED to include Minardi (20.5)
            const x = d3.scaleLinear().domain([22, 1]).range([0, width]);
            const y = d3.scaleLinear().domain([50, 100]).range([height, 0]);

            svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x));
            svg.append("g").call(d3.axisLeft(y));

            svg.append("text").attr("x", width/2).attr("y", height + 35).text("Avg Grid Position (Speed)").attr("fill", "#333").attr("text-anchor", "middle");
            svg.append("text").attr("transform", "rotate(-90)").attr("y", -35).attr("x", -height/2).text("Reliability %").attr("fill", "#333").attr("text-anchor", "middle");

            svg.selectAll("circle").data(reliabilityData).enter().append("circle")
                .attr("cx", d => x(d.avg_grid))
                .attr("cy", d => y(d.reliability))
                .attr("r", 6)
                .style("fill", d => d.reliability < 75 ? "#ff4444" : "#44ff44") // Red if unreliable
                .style("stroke", "#555")
                .on("mouseover", (e, d) => showTooltipRaw(e, `${d.label}: P${d.avg_grid}, ${d.reliability}%`))
                .on("mouseout", hideTooltip);
        }

        // --- Utility ---
        function showTooltipRaw(event, text) { tooltip.text(text).style("display", "block").style("left", (event.pageX+15)+"px").style("top", (event.pageY-15)+"px"); }
        function hideTooltip() { tooltip.style("display", "none"); }
        function openModal(title) {
            modalTitle.text(title);
            modal.style("display", "block");
            clearModal();
            // Force hide tooltip immediately
            hideTooltip();
            restoreHighlight();
        }
        function closeModal() { modal.style("display", "none"); clearModal(); }
        function clearModal() { modalChart.html(""); modalOvertakes.html(""); modalDescription.html(""); }
    }
});