import * as THREE from "../lib/three.module.js";
import { OrbitControls } from "../lib/OrbitControls.js";

window.addEventListener(
  "DOMContentLoaded",
  () => {
    const wrapper = document.querySelector("#webgl");
    const app = new ThreeApp(wrapper);
    app.render();
  },
  false
);

class ThreeApp {
  /**
   * カメラ定義のための定数
   */
  static CAMERA_PARAM = {
    fovy: 60,
    aspect: window.innerWidth / window.innerHeight,
    near: 0.1,
    far: 20.0,
    position: new THREE.Vector3(0.0, 2.0, 10.0),
    lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
  };
  /**
   * レンダラー定義のための定数
   */
  static RENDERER_PARAM = {
    clearColor: 0xeeeeee,
    width: window.innerWidth,
    height: window.innerHeight,
  };
  /**
   * 平行光源定義のための定数
   */
  static DIRECTIONAL_LIGHT_PARAM = {
    color: 0xffffff,
    intensity: 1.0,
    position: new THREE.Vector3(1.0, 1.0, 1.0),
  };
  /**
   * アンビエントライト定義のための定数
   */
  static AMBIENT_LIGHT_PARAM = {
    color: 0xffffff,
    intensity: 2,
  };
  /**
   * マテリアル定義のための定数
   */
  static MATERIAL_PARAM = {
    color: 0xeeeeee,
  };

  renderer; // レンダラ
  scene; // シーン
  camera; // カメラ
  directionalLight; // 平行光源（ディレクショナルライト）
  ambientLight; // 環境光（アンビエントライト）
  material; // マテリアル
  sphereGeometry; // sphereジオメトリ
  torusArray; // トーラスメッシュの配列
  controls; // オービットコントロール
  axesHelper; // 軸ヘルパー
  isDown; // キーの押下状態用フラグ
  group; // グループ

  /**
   * コンストラクタ
   * @constructor
   * @param {HTMLElement} wrapper - canvas 要素を append する親要素
   */
  constructor(wrapper) {
    // レンダラー
    const color = new THREE.Color(ThreeApp.RENDERER_PARAM.clearColor);
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setClearColor(color);
    this.renderer.setSize(
      ThreeApp.RENDERER_PARAM.width,
      ThreeApp.RENDERER_PARAM.height
    );
    wrapper.appendChild(this.renderer.domElement);

    // シーン
    this.scene = new THREE.Scene();

    // カメラ
    this.camera = new THREE.PerspectiveCamera(
      ThreeApp.CAMERA_PARAM.fovy,
      ThreeApp.CAMERA_PARAM.aspect,
      ThreeApp.CAMERA_PARAM.near,
      ThreeApp.CAMERA_PARAM.far
    );
    this.camera.position.copy(ThreeApp.CAMERA_PARAM.position);
    this.camera.lookAt(ThreeApp.CAMERA_PARAM.lookAt);

    // ディレクショナルライト（平行光源）
    this.directionalLight = new THREE.DirectionalLight(
      ThreeApp.DIRECTIONAL_LIGHT_PARAM.color,
      ThreeApp.DIRECTIONAL_LIGHT_PARAM.intensity
    );
    this.directionalLight.position.copy(
      ThreeApp.DIRECTIONAL_LIGHT_PARAM.position
    );
    this.scene.add(this.directionalLight);

    // アンビエントライト（環境光）
    this.ambientLight = new THREE.AmbientLight(
      ThreeApp.AMBIENT_LIGHT_PARAM.color,
      ThreeApp.AMBIENT_LIGHT_PARAM.intensity
    );
    this.scene.add(this.ambientLight);

    // マテリアル
    this.material = new THREE.MeshPhongMaterial(ThreeApp.MATERIAL_PARAM);

    // グループを複数作成するための配列
    this.groups = [];

    // 共通のジオメトリ、マテリアルから、複数のメッシュインスタンスを作成する
    const sphereCount = 10; // 球の数
    const maxSphereDistance = 4; // 球同士の最大距離
    const minSphereDistance = 2; // 球同士の最小距離
    this.sphereGeometry = new THREE.SphereGeometry(0.4, 10, 10);

    // 回転軸の配列を定義
    const rotationAxes = [
      new THREE.Vector3(1, 0, 0), // X軸
      new THREE.Vector3(0, 1, 0), // Y軸
      new THREE.Vector3(0, 0, 1), // Z軸
    ];

    // グループを3つ作成して異なる回転軸を設定
    for (let j = 0; j < rotationAxes.length; ++j) {
      const group = new THREE.Group();

      // 初期位置の設定
      for (let i = 0; i < sphereCount; ++i) {
        const sphere = new THREE.Mesh(this.sphereGeometry, this.material);

        const radian = (i / sphereCount) * Math.PI * 2;
        const initialX = Math.cos(radian) * maxSphereDistance;
        const initialZ = Math.sin(radian) * maxSphereDistance;

        sphere.position.set(initialX, 0, initialZ);
        group.add(sphere);
      }

      // グループをシーンに追加
      this.scene.add(group);
      this.groups.push({ group, axis: rotationAxes[j] });
    }

    // アニメーションの速度調整用の定数
    this.baseAnimationSpeed = 0.012;
    this.fastAnimationSpeed = 0.02;
    this.animationSpeed = this.baseAnimationSpeed;
    // アニメーションパス上の現在位置（0から1の間）
    let currentPosition = 0;

    // 球のアニメーションを実行する関数
    const animateSpheres = () => {
      currentPosition += this.animationSpeed;

      if (currentPosition >= 1) {
        currentPosition = 0;
      }

      // アニメーションの進行度に基づいて距離を計算する
      const sphereDistance =
        minSphereDistance +
        (maxSphereDistance - minSphereDistance) *
          (0.5 - 0.5 * Math.cos(currentPosition * Math.PI * 2));

      // グループ内のすべての球の位置を更新する
      this.groups.forEach(({ group, axis }) => {
        for (let i = 0; i < sphereCount; ++i) {
          const radian = (i / sphereCount) * Math.PI * 2;
          const sphere = group.children[i]; // グループ内の各球にアクセスする

          const targetX = Math.cos(radian) * sphereDistance;
          const targetZ = Math.sin(radian) * sphereDistance;

          sphere.position.set(targetX, 0, targetZ);
        }

        // グループを回転させる
        group.rotation.x += axis.x * this.animationSpeed;
        group.rotation.y += axis.y * this.animationSpeed;
        group.rotation.z += axis.z * this.animationSpeed;
      });

      // 次のフレームをリクエストする
      requestAnimationFrame(animateSpheres);
    };

    // アニメーションを開始する
    animateSpheres();

    // 軸ヘルパー
    const axesBarLength = 0;
    this.axesHelper = new THREE.AxesHelper(axesBarLength);
    this.scene.add(this.axesHelper);

    // コントロール
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // this のバインド
    this.render = this.render.bind(this);

    // キーの押下状態を保持するフラグ
    this.isDown = false;

    // キーの押下や離す操作を検出できるようにする
    window.addEventListener(
      "keydown",
      (keyEvent) => {
        switch (keyEvent.key) {
          case " ":
            this.isDown = true;
            this.animationSpeed = this.fastAnimationSpeed;
            break;
          default:
        }
      },
      false
    );
    window.addEventListener(
      "keyup",
      (keyEvent) => {
        if (keyEvent.key === " ") {
          this.isDown = false;
          this.animationSpeed = this.baseAnimationSpeed;
        }
      },
      false
    );

    // ウィンドウのリサイズを検出できるようにする
    window.addEventListener(
      "resize",
      () => {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
      },
      false
    );
  }

  /**
   * 描画処理
   */
  render() {
    // 恒常ループ
    requestAnimationFrame(this.render);

    // コントロールを更新
    this.controls.update();

    // レンダラーで描画
    this.renderer.render(this.scene, this.camera);
  }
}
