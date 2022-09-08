import sys
sys.path.append('./stable_diffusion')

from flask import Flask
import tasks

app = Flask("fusion-kit")

@app.route("/")
def hello_world():
    tasks.txt2img()
    return "Generation complete"

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0')
