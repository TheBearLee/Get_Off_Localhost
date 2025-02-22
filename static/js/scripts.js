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
let currentStretchIndex = 0;
const stretches = ['Arm stretching', 'Neck stretching', 'Side stretching', 'Forward bend'];

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

function stopTimer() {
    clearInterval(timerInterval);
    isTimerRunning = false;
    console.log('Timer stopped');
}

function resumeTimer() {
    if (!isTimerRunning && timeLeft > 0) {
        timerInterval = setInterval(() => {
            if (timeLeft > 0) {
                timeLeft--;
                updateTimerDisplay();
            } else {
                clearInterval(timerInterval);
                console.log('Timer ended without detecting the stretch 3 times.');
                nextStretch();
            }
        }, 1000);
        isTimerRunning = true;
        console.log('Timer resumed');
    }
}

updateTimerDisplay();

async function runPoseTracking() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const detectionBox = document.getElementById('detection-box');
    const stretchBox = document.getElementById('stretch-box');
    const net = await posenet.load();
    console.log('PoseNet model loaded');

    setInterval(() => {detectPoses()}, 500);

    async function detectPoses() {
        const pose = await net.estimateSinglePose(video, {
            flipHorizontal: false
        });
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (pose.score > 0.5) {
            detectionBox.style.backgroundColor = 'green';
            console.log('Pose detected');
            drawKeypoints(pose.keypoints, 0.5, ctx);
            drawSkeleton(pose.keypoints, 0.5, ctx);

            if (!stretchFunctions[currentStretchIndex % stretches.length](pose)) {
                stoptimer();
            }
        } else {
            detectionBox.style.backgroundColor = 'red';
            console.log('No pose detected');
            stretchBox.textContent = 'No stretch detected';
        }
        requestAnimationFrame(detectPoses);
    }
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

function isNeckStretching(pose) {
    const nose = pose.keypoints.find(k => k.part === 'nose');
    const leftShoulder = pose.keypoints.find(k => k.part === 'leftShoulder');
    const rightShoulder = pose.keypoints.find(k => k.part === 'rightShoulder');

    if (nose && leftShoulder && rightShoulder) {
        const noseY = nose.position.y;
        const leftShoulderY = leftShoulder.position.y;
        const rightShoulderY = rightShoulder.position.y;

        const leftTilt = noseY < leftShoulderY - 10;
        const rightTilt = noseY < rightShoulderY - 10;

        return leftTilt || rightTilt;
    }
    return false;
}

function isSideStretching(pose) {
    const leftShoulder = pose.keypoints.find(k => k.part === 'leftShoulder');
    const rightShoulder = pose.keypoints.find(k => k.part === 'rightShoulder');
    const leftHip = pose.keypoints.find(k => k.part === 'leftHip');
    const rightHip = pose.keypoints.find(k => k.part === 'rightHip');

    if (leftShoulder && rightShoulder && leftHip && rightHip) {
        const leftSideStretch = leftShoulder.position.x < leftHip.position.x;
        const rightSideStretch = rightShoulder.position.x > rightHip.position.x;

        return leftSideStretch || rightSideStretch;
    }
    return false;
}

function isArmStretching(pose) {
    const leftWrist = pose.keypoints.find(k => k.part === 'leftWrist');
    const rightWrist = pose.keypoints.find(k => k.part === 'rightWrist');
    const leftShoulder = pose.keypoints.find(k => k.part === 'leftShoulder');
    const rightShoulder = pose.keypoints.find(k => k.part === 'rightShoulder');

    if (leftWrist && rightWrist && leftShoulder && rightShoulder) {
        const leftArmRaised = leftWrist.position.y < leftShoulder.position.y;
        const rightArmRaised = rightWrist.position.y < rightShoulder.position.y;

        return leftArmRaised && rightArmRaised;
    }
    return false;
}

function isForwardBend(pose) {
    const nose = pose.keypoints.find(k => k.part === 'nose');
    const leftHip = pose.keypoints.find(k => k.part === 'leftHip');
    const rightHip = pose.keypoints.find(k => k.part === 'rightHip');

    if (nose && leftHip && rightHip) {
        const forwardBend = nose.position.y > (leftHip.position.y + rightHip.position.y) / 2;

        return forwardBend;
    }
    return false;
}

const stretchFunctions = [
    isArmStretching,
    isNeckStretching,
    isSideStretching,
    isForwardBend
];
runPoseTracking();
