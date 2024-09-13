from flask import Flask, render_template, request
app = Flask(__name__)

# Store notification messages
notifications = []

@app.route('/')
def index():
    return render_template('index.html', notifications=notifications)

@app.route('/notify', methods=['POST'])
def notify():
    message = request.form.get('message')
    if message:
        notifications.append(message)
    return '', 200

if __name__ == '__main__':
    app.run(debug=True)
