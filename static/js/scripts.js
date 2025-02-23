async function startVideo() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const video = document.getElementById('video');
        video.srcObject = stream;
        //console.log('Video stream started');
    } catch (error) {
        console.log('Error accessing the camera: ' + error);
    }
}
startVideo();

let timerInterval;
let timeLeft = 15;
let currentStretchIndex = Math.floor(Math.random() * 4);
let stretchCount = 1;
const stretches = ['Arm stretching', 'Neck stretching', 'Side stretching', 'Forward bend'];

function updateTimerDisplay() {
    document.getElementById('timer').textContent = timeLeft;
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    const stretchBox = document.getElementById('stretch-box');
    stretchBox.textContent = stretches[currentStretchIndex % stretches.length];
    timerInterval = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            updateTimerDisplay();
        } else {
            clearInterval(timerInterval);
        }
    }, 1000);
    //console.log('Timer started');
}

function resetTimer() {
    clearInterval(timerInterval);
    timeLeft = 15;
    updateTimerDisplay();
    //console.log('Timer reset');
}

function stopTimer() {
    clearInterval(timerInterval);
    isTimerRunning = false;
    //console.log('Timer stopped');
}

function resumeTimer() {
    if (!isTimerRunning && timeLeft > 0) {
        timerInterval = setInterval(() => {
            if (timeLeft > 0) {
                timeLeft--;
                updateTimerDisplay();
            } else {
                clearInterval(timerInterval);
                //console.log('Timer ended without detecting the stretch 3 times.');
                nextStretch();
            }
        }, 1000);
        isTimerRunning = true;
        //console.log('Timer resumed');
    }
}

function nextStretch() {
    currentStretchIndex++;
    stretchCount++;
    resetTimer();
    const stretchBox = document.getElementById('stretch-box');
    stretchBox.textContent = stretches[currentStretchIndex % stretches.length];
    console.log('Next stretch');
}

updateTimerDisplay();

async function runPoseTracking() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const detectionBox = document.getElementById('detection-box');
    const stretchBox = document.getElementById('stretch-box');
    const net = await posenet.load();
    //console.log('PoseNet model loaded');

    setInterval(() => {detectPoses()}, 100);

    async function detectPoses() {
        const pose = await net.estimateSinglePose(video, {
            flipHorizontal: false
        });
        stretchBox.textContent = stretches[currentStretchIndex % stretches.length];
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (pose.score > 0.5) {
            detectionBox.style.backgroundColor = 'green';
            //console.log('Pose detected');
            drawKeypoints(pose.keypoints, 0.5, ctx);
            drawSkeleton(pose.keypoints, 0.5, ctx);

            if (!stretchFunctions[currentStretchIndex % stretches.length](pose)) {
                stopTimer();
            }
            if (stretchCount >= 3) {
                stretchBox.textContent = 'You have completed all the stretches for today!';
                stopTimer();
            }
            else if (!isTimerRunning && stretchFunctions[currentStretchIndex % stretches.length](pose)) {
                resumeTimer();
            }
            if (timeLeft === 0) {
                nextStretch();
            }
            
        } else {
            detectionBox.style.backgroundColor = 'red';
            console.log('No pose detected');
            stretchBox.textContent = 'No stretch detected';
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
    const leftEar = pose.keypoints.find(k => k.part === 'leftEar');
    const rightEar = pose.keypoints.find(k => k.part === 'rightEar');
    const leftShoulder = pose.keypoints.find(k => k.part === 'leftShoulder');
    const rightShoulder = pose.keypoints.find(k => k.part === 'rightShoulder');

    if (leftEar && rightEar && leftShoulder && rightShoulder) {
        const leftEarY = leftEar.position.y;
        const rightEarY = rightEar.position.y;
        const leftShoulderY = leftShoulder.position.y;
        const rightShoulderY = rightShoulder.position.y;

        const leftTilt = (leftShoulderY - leftEarY) <= 90;
        const rightTilt = (rightShoulderY - rightEarY) <= 90;

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
        const leftSideStretch = (leftHip.position.y - leftShoulder.position.y) > 150;
        const rightSideStretch =  (rightHip.position.y - rightShoulder.position.y) > 150;

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

function isArmcross(pose) {
    const leftWrist = pose.keypoints.find(k => k.part === 'leftWrist');
    const rightWrist = pose.keypoints.find(k => k.part === 'rightWrist');
    const leftShoulder = pose.keypoints.find(k => k.part === 'leftShoulder');
    const rightShoulder = pose.keypoints.find(k => k.part === 'rightShoulder');

    if (leftWrist && rightWrist && leftShoulder && rightShoulder) {
        const crossLeft = (leftWrist.position.x > rightShoulder.position.x);
        const crossRight = (rightWrist.position.x < leftShoulder.position.x);

        return crossLeft || crossRight;
    }
    return false;
}

const stretchFunctions = [
    isArmStretching,
    isNeckStretching,
    isSideStretching,
    isArmcross
];
runPoseTracking();