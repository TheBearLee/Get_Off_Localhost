let button = document.getElementById('requestPermission');

button.onclick = ()=>{
    console.log('ya');
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
    if (navigator.getUserMedia) {
        navigator.getUserMedia({ audio: false, video: { width: 1280, height: 720 } },
            function(stream) {
                console.log('success');
            },
            function(err) {
                console.log("The following error occurred: " + err.name);
            }
        );
    }
}