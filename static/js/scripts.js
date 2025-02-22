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

    setInterval(() => {detectPoses();}, 5000);

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

            if (isArmStretching(pose)) {
                console.log('Arm stretching detected');
                resetTimer();
            }
            if (isNeckStretching(pose)) {
                console.log('Neck stretching detected');
                resetTimer();
            }
            if (isSideStretching(pose)) {
                console.log('Side stretching detected');
                resetTimer();
            }
            if (isForwardBend(pose)) {
                console.log('Forward bend detected');
                resetTimer();
            }
        } else {
            detectionBox.style.backgroundColor = 'red';
            console.log('No pose detected');
        }
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

        const leftTilt = noseY < leftShoulderY - 20;
        const rightTilt = noseY < rightShoulderY - 20;

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
runPoseTracking();
