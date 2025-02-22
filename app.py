from flask import Flask, render_template, request
import logging

app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.INFO)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/log', methods=['POST'])
def log():
    message = request.json.get('message')
    app.logger.info(message)
    return '', 204

if __name__ == '__main__':
    app.run(debug=True)
