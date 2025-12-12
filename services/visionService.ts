import { HandLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";

export interface HandData {
  landmarks: { x: number; y: number; z: number }[];
  handedness: "Left" | "Right";
}

class VisionService {
  private handLandmarker: HandLandmarker | undefined;
  private video: HTMLVideoElement | null = null;
  private lastVideoTime = -1;
  private animationFrameId: number | null = null;
  public onResults: ((hands: HandData[]) => void) | null = null;
  public isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;

    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm"
      );

      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 2,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      this.isInitialized = true;
      console.log("Vision Service Initialized");
    } catch (error) {
      console.error("Failed to initialize vision service:", error);
      throw error;
    }
  }

  async startCamera(videoElement: HTMLVideoElement) {
    if (!this.handLandmarker) await this.initialize();

    this.video = videoElement;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 1280,
          height: 720,
          facingMode: "user"
        }
      });
      
      this.video.srcObject = stream;
      await this.video.play();
      this.predictWebcam();
    } catch (err) {
      console.error("Error accessing webcam:", err);
      throw err;
    }
  }

  stopCamera() {
    if (this.video && this.video.srcObject) {
      const stream = this.video.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      this.video.srcObject = null;
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private predictWebcam = () => {
    if (!this.handLandmarker || !this.video) return;

    // Detect only when video has new frame
    if (this.video.currentTime !== this.lastVideoTime) {
      this.lastVideoTime = this.video.currentTime;
      const results = this.handLandmarker.detectForVideo(this.video, performance.now());
      
      if (results.landmarks && this.onResults) {
        const hands: HandData[] = results.landmarks.map((landmarks, index) => ({
          landmarks: landmarks,
          handedness: results.handedness[index][0].categoryName as "Left" | "Right"
        }));
        this.onResults(hands);
      }
    }
    
    this.animationFrameId = requestAnimationFrame(this.predictWebcam);
  };
}

export const visionService = new VisionService();