import sys
import os

# Lisätään nykyinen kansio Python-polkuun, jotta utils-haut toimivat
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils.server import app

if __name__ == '__main__':
    print("==================================================")
    print("   LUMI LLM VISUALISOIJA PALVELIN KÄYNNISTYY   ")
    print("==================================================")
    print("Avaa selain osoitteessa: http://127.0.0.1:5005")
    print("==================================================")
    app.run(host='127.0.0.1', port=5005, debug=False)
