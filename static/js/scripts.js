async function startVideo() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const video = document.getElementById('video');
        video.srcObject = stream;
        console.log('Video stream started');
    } catch (error) {
        console.log('Error accessing the camera: ' + error);
    }
}
startVideo();

let timerInterval;
let timeLeft = 45;

function updateTimerDisplay() {
    document.getElementById('timer').textContent = timeLeft;
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            updateTimerDisplay();
        } else {
            clearInterval(timerInterval);
        }
    }, 1000);
    console.log('Timer started');
}

function resetTimer() {
    clearInterval(timerInterval);
    timeLeft = 45;
    updateTimerDisplay();
    console.log('Timer reset');
}

updateTimerDisplay();

async function runPoseTracking() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const detectionBox = document.getElementById('detection-box');
    const net = await posenet.load();
    console.log('PoseNet model loaded');

    async function detectPoses() {
        const pose = await net.estimateSinglePose(video, {
            flipHorizontal: false
        });
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawCanvas(video, 0, 0, canvas.width, canvas.height);
        if (pose.score > 0.5) {
            detectionBox.style.backgroundColor = 'green';
            console.log('Pose detected');
            drawKeypoints(pose.keypoints, 0.5, ctx);
            drawSkeleton(pose.keypoints, 0.5, ctx);
        } else {
            detectionBox.style.backgroundColor = 'red';
            console.log('No pose detected');
        }
        requestAnimationFrame(detectPoses);
    }

    detectPoses();
}

function drawKeypoints(keypoints, minConfidence, ctx, scale = 1) {
    keypoints.forEach(keypoint => {
        if (keypoint.score >= minConfidence) {
            const { y, x } = keypoint.position;
            drawPoint(ctx, y * scale, x * scale, 3, 'red');
        }
    });
}

function drawPoint(ctx, y, x, r, color) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
}

function drawSkeleton(keypoints, minConfidence, ctx, scale = 1) {
    const adjacentKeyPoints = posenet.getAdjacentKeyPoints(keypoints, minConfidence);

    adjacentKeyPoints.forEach((keypoints) => {
        drawSegment(toTuple(keypoints[0].position), toTuple(keypoints[1].position), 'red', scale, ctx);
    });
}

function drawSegment([ay, ax], [by, bx], color, scale, ctx) {
    ctx.beginPath();
    ctx.moveTo(ax * scale, ay * scale);
    ctx.lineTo(bx * scale, by * scale);
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.stroke();
}

function toTuple({ y, x }) {
    return [y, x];
}

runPoseTracking();
