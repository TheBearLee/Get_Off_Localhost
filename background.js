chrome.runtime.onInstalled.addListener(() => {
  console.log("Hacklytics2025Extension installed.");
  fetch('http://localhost:5000/start_flask_app')
    .then(response => response.json())
    .then(data => console.log(data))
    .catch(error => console.error('Error:', error));
});
