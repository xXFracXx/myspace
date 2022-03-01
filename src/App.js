import {
  FreeCamera,
  Vector3,
  // HemisphericLight,
  MeshBuilder,
  StandardMaterial,
  Texture,
  Color4,
  TransformNode,
  VertexData,
  Color3,
  Scalar,
  Matrix,
  Mesh,
  AssetsManager,
} from "@babylonjs/core";
import SceneComponent from "babylonjs-hook";
import "./App.css";

let starMesh;
let starLimit = 5000;
let starScale = 0.5;
let radius = 300;
// let showAsterisms = true;
// let asterismColor = Color3(0, 0, 0.7);
let twinkleStars = true;

const _starScaleFactor = function (starIndex, starData) {
  // Magnitude is counterintuitive - lower values are hgiher magnitudes!
  // "Lowest" magnitude in star data is 7.8, "highest" is -1.44 for Sirius.
  // So we need to invert these & ensure positive to get scale that approximates magnitude.
  return (8 - starData.apparentMagnitude[starIndex]) * starScale;
};

const _starColor = function (starIndex, starData) {
  // Normalize star color fraction from colorIndexBV range of -0.4-2.0 to 0.0-1.0.
  let fraction = Scalar.Normalize(starData.colorIndexBV[starIndex], -0.4, 2.0);

  // Calculate star color index.
  let maxColorIndex = starData.color.length - 1;
  let colorIndex = Math.round(maxColorIndex * fraction);
  colorIndex = Scalar.Clamp(colorIndex, 0, maxColorIndex);

  // Look-up and return star color.
  let c = starData.color[colorIndex];
  return new Color4(c[0], c[1], c[2], 0);
};

const onSceneReady = (scene) => {
  scene.clearColor = new Color3(0, 0, 0);

  // // This creates and positions a free camera (non-mesh)
  // var camera = new FreeCamera("camera1", new Vector3(0, 5, -10), scene);

  // // This targets the camera to scene origin
  // camera.setTarget(Vector3.Zero());

  // const canvas = scene.getEngine().getRenderingCanvas();

  // // This attaches the camera to the canvas
  // camera.attachControl(canvas, true);

  // // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
  // var light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);

  // // Default intensity is 1. Let's dim the light a small amount
  // light.intensity = 0.7;

  // // Our built-in 'box' shape.
  // box = MeshBuilder.CreateBox("box", { size: 2 }, scene);

  // // Move the box upward 1/2 its height
  // box.position.y = 1;

  // // Our built-in 'ground' shape.
  // MeshBuilder.CreateGround("ground", { width: 6, height: 6 }, scene);

  let assetsManager = new AssetsManager(scene);

  // assetsManager.onProgress = function (
  //   remainingCount,
  //   totalCount,
  //   lastFinishedTask
  // ) {
  //   var loadingUIText =
  //     "We are loading the scene. " +
  //     remainingCount +
  //     " out of " +
  //     totalCount +
  //     " items still need to be loaded.";
  //   console.log(loadingUIText);
  // };

  let starDataTask = assetsManager.addTextFileTask(
    "star-data",
    "star-data.json"
  );

  starMesh = new Mesh("starMesh", scene);
  starMesh.alphaIndex = 100;

  starDataTask.onSuccess = (starDataTask) => {
    var starData = JSON.parse(starDataTask.text);
    console.log(starData);
    // celestialSphere = new CelestialSphere("celestialSphere", this._scene, starData, radius, starLimit, starScale, showAsterisms, asterismColor, twinkleStars);

    // Mesh vertex data arrays.
    let positions = [];
    let indices = [];
    let colors = [];
    let uvs = [];
    let uvs2 = [];

    let vertexIndex = 0;
    let numberOfStars = Math.min(starData.rightAscension.length, starLimit);

    // Populate vertex data arrays for each star.
    for (let starIndex = 0; starIndex < numberOfStars; starIndex++) {
      // Star celestial coordinates.
      let ra = starData.rightAscension[starIndex]; // eastward in radians (around Y axis - yaw)
      let dec = starData.declination[starIndex]; // north-south in radians (around X axis - pitch)

      // Star scale factor (based on apparent magnitude).
      var s = _starScaleFactor(starIndex, starData);

      // Create star vertices around +Z axis & scale to size.
      let v1 = new Vector3(0.0 * s, 0.7 * s, radius);
      let v2 = new Vector3(-0.5 * s, -0.3 * s, radius);
      let v3 = new Vector3(0.5 * s, -0.3 * s, radius);

      // Rotate vertices into position on celestial sphere.
      let rotationMatrix = Matrix.RotationYawPitchRoll(-ra, -dec, 0);
      v1 = Vector3.TransformCoordinates(v1, rotationMatrix);
      v2 = Vector3.TransformCoordinates(v2, rotationMatrix);
      v3 = Vector3.TransformCoordinates(v3, rotationMatrix);

      // Add vertex positions.
      positions.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z, v3.x, v3.y, v3.z);

      // Add vertex color.
      let c = _starColor(starIndex, starData);
      colors.push(c.r, c.g, c.b, c.a, c.r, c.g, c.b, c.a, c.r, c.g, c.b, c.a);

      // Add star texture UV coordinates.
      uvs.push(0.5, 1.0, 0.0, 0.0, 1.0, 0.0);

      // Add 'twinkle' (noise) texture UV coordinates.
      let u = Math.random();
      let v = Math.random();
      uvs2.push(u, v, u, v, u, v);

      // Add indices.
      indices.push(vertexIndex, vertexIndex + 1, vertexIndex + 2);
      vertexIndex += 3;
    }

    // Create & assign vertex data to mesh.
    let vertexData = new VertexData();
    vertexData.positions = positions;
    vertexData.indices = indices;
    vertexData.colors = colors;
    vertexData.uvs = uvs;
    vertexData.uvs2 = uvs2;
    vertexData.applyToMesh(starMesh);

    // Create & assign star material.
    let starMaterial = new StandardMaterial("starMaterial", scene);
    let opacityTexture = new Texture("star.png", scene);
    starMaterial.opacityTexture = opacityTexture;
    starMaterial.disableLighting = true;
    starMesh.material = starMaterial;

    // Twinkle stars (simulate atmospheric turbulence).
    if (twinkleStars) {
      let emissiveTexture = new Texture("noise.png", scene);
      starMaterial.emissiveTexture = emissiveTexture;
      emissiveTexture.coordinatesIndex = 1; // uvs2

      // Animate emissive texture to simulate star 'twinkle' effect.
      scene.registerBeforeRender(() => {
        emissiveTexture.uOffset += 0.008;
      });
    } else {
      starMaterial.emissiveColor = new Color3(1, 1, 1);
    }

    // Draw helpers (celestial equator and axis).
    let helperColor = new Color3(1, 0, 0);

    // Draw celestial equator.
    let points = [];
    let steps = 100;
    for (let i = 0; i < steps + 1; i++) {
      let a = (Math.PI * 2 * i) / steps;
      let x = Math.cos(a) * radius;
      let y = 0;
      let z = Math.sin(a) * radius;

      points.push(new Vector3(x, y, z));
    }

    radius += 20;
    //Array of paths to construct tube
    let c = 2 * Math.PI * radius;
    let h = c / 4 / 2;
    let myPath = [new Vector3(0, 0, h), new Vector3(0, 0, -h)];

    let tubeParentXform = new TransformNode("tubeParentXform", scene);
    let tubeChildXform = new TransformNode("tubeChildXform", scene);
    let tube = MeshBuilder.CreateTube(
      "tube",
      {
        path: myPath,
        radius: radius,
        sideOrientation: Mesh.BACKSIDE,
        updatable: false,
      },
      scene
    );
    tube.alphaIndex = 0;
    let tubeTexture = new Texture("eso0932a.png", scene, true, false);
    tubeTexture.vScale = -1;
    tube.parent = tubeChildXform;
    tubeChildXform.parent = tubeParentXform;
    tube.rotate(new Vector3(0, 0, -1), 0.57);
    tubeChildXform.rotate(new Vector3(1, 0, 0), 0.48);
    tubeParentXform.rotate(new Vector3(0, -1, 0), 0.22);
    let tubeMaterial = new StandardMaterial("skyBox", scene);
    tubeMaterial.backFaceCulling = true;
    tubeMaterial.disableLighting = true;
    tubeMaterial.emissiveTexture = tubeTexture;
    tube.material = tubeMaterial;
    tube.material.alpha = 0.5;
    tubeParentXform.parent = this;
  };

  starDataTask.onError = function (task, message, exception) {
    console.log(message, exception);
  };

  assetsManager.load();

  scene.createDefaultCameraOrLight(true, true, true);
};

const onRender = (scene) => {
  // if (box !== undefined) {
  //   var deltaTimeInMillis = scene.getEngine().getDeltaTime();
  //   const rpm = 10;
  //   box.rotation.y += (rpm / 60) * Math.PI * 2 * (deltaTimeInMillis / 1000);
  // }
};

function App() {
  return (
    <div>
      <SceneComponent
        antialias
        onSceneReady={onSceneReady}
        onRender={onRender}
        id="my-canvas"
      />
    </div>
  );
}

export default App;
