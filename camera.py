import os
import cv2
import numpy as np
import mediapipe as mp
import onnxruntime as ort
import time
from collections import deque, Counter
from flask import Flask, Response, jsonify
from flask_cors import CORS

os.environ["GLOG_minloglevel"] = "3"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"

app = Flask(__name__)
CORS(app)

estado_entrevista = {
    "fps": 0,
    "score_geral": 100,
    "postura_status": "Analisando...",
    "contato_visual": 0,
    "emocao_dominante": "Neutro",
    "atencao_alerta": False,
    "gestos_alerta": False
}

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ONNX_PATH = os.path.join(BASE_DIR, "models", "emotion-ferplus.onnx")

EMO_LABELS = ["Neutro", "Felicidade", "Surpresa", "Tristeza", "Raiva", "Nojo", "Medo", "Desprezo"]
sess_emo = ort.InferenceSession(ONNX_PATH, providers=["CPUExecutionProvider"]) if os.path.exists(ONNX_PATH) else None

mp_hol = mp.solutions.holistic
hol = mp_hol.Holistic(refine_face_landmarks=True)
mp_draw = mp.solutions.drawing_utils

def get_emotion(face):
    if sess_emo is None:
        return "Neutro"
    try:
        gray = cv2.cvtColor(face, cv2.COLOR_BGR2GRAY)
        gray = cv2.resize(gray, (64, 64)).astype(np.float32) / 255.0
        tensor = gray[np.newaxis, np.newaxis, :, :]
        out = sess_emo.run(None, {sess_emo.get_inputs()[0].name: tensor})[0][0]
        return EMO_LABELS[np.argmax(out)]
    except:
        return "Neutro"

def calcular_contato(face_landmarks):
    if not face_landmarks:
        return 0, True

    li = face_landmarks.landmark[468].x
    ri = face_landmarks.landmark[473].x
    le = (face_landmarks.landmark[362].x + face_landmarks.landmark[263].x) / 2
    re = (face_landmarks.landmark[133].x + face_landmarks.landmark[33].x) / 2

    dist = (abs(li - le) + abs(ri - re)) / 2
    max_dev = 0.006
    score = max(0, int((1 - dist / max_dev) * 100))
    return score, score < 50

def generate_frames():
    cap = cv2.VideoCapture(0)

    hist_postura = deque(maxlen=30)
    hist_emocao = deque(maxlen=15)
    hist_contato = deque(maxlen=20)

    start = time.time()
    frames = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame = cv2.flip(frame, 1)
        h, w, _ = frame.shape
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        res = hol.process(rgb)

        score = 100
        alerta = False

        if res.pose_landmarks:
            l = res.pose_landmarks.landmark
            postura_ruim = abs(l[11].y - l[12].y) > 0.04
            hist_postura.append(postura_ruim)
            mp_draw.draw_landmarks(frame, res.pose_landmarks, mp_hol.POSE_CONNECTIONS)

        if res.face_landmarks:
            xs = [p.x for p in res.face_landmarks.landmark]
            ys = [p.y for p in res.face_landmarks.landmark]
            x1, x2 = int(min(xs)*w), int(max(xs)*w)
            y1, y2 = int(min(ys)*h), int(max(ys)*h)
            face = frame[y1:y2, x1:x2]

            emo = get_emotion(face) if face.size > 0 else "Neutro"
            hist_emocao.append(emo)

            contato, alerta = calcular_contato(res.face_landmarks)
            hist_contato.append(contato)

            cv2.rectangle(frame, (x1, y1), (x2, y2), (0,255,0), 2)

        postura_final = "Corrigir Postura" if sum(hist_postura) > len(hist_postura)/2 else "Excelente"
        emocao_final = Counter(hist_emocao).most_common(1)[0][0] if hist_emocao else "Neutro"
        contato_medio = int(np.mean(hist_contato)) if hist_contato else 0

        if postura_final != "Excelente":
            score -= 10
        if alerta:
            score -= 15

        frames += 1
        fps = int(frames / (time.time() - start))

        estado_entrevista.update({
            "fps": fps,
            "score_geral": max(0, score),
            "postura_status": postura_final,
            "emocao_dominante": emocao_final,
            "contato_visual": contato_medio,
            "atencao_alerta": alerta,
            "gestos_alerta": False
        })

        _, buffer = cv2.imencode(".jpg", frame)
        yield b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + buffer.tobytes() + b"\r\n"

@app.route("/video")
def video():
    return Response(generate_frames(), mimetype="multipart/x-mixed-replace; boundary=frame")

@app.route("/dados")
def dados():
    return jsonify(estado_entrevista)

if __name__ == "__main__":
    app.run(port=5000, debug=False)
