import sqlite3

try:
    conn = sqlite3.connect(r'C:\Users\Windows 11\AppData\Roaming\vexcore\sistema_visitas.db')
    cursor = conn.cursor()
    cursor.execute("SELECT foto, fotos FROM estoque WHERE nome LIKE '%943369%'")
    row = cursor.fetchone()
    if row:
        print("FOTO:", row[0])
        print("FOTOS:", row[1])
    else:
        print("Nenhum veiculo encontrado.")
except Exception as e:
    print("ERRO:", e)
