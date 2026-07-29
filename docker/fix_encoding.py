#!/usr/bin/env python3
"""
Corrige nombres mal codificados (mojibake CP850 -> UTF-8) en la base de datos.

Problema:
    El texto original en UTF-8 (con tildes, ñ, etc.) fue interpretado en algún
    punto como CP850 (página de códigos DOS/Latin) y vuelto a guardar como UTF-8.
    Ejemplo: "á" (bytes UTF-8: C3 A1) terminó guardado como "├í".

Solución:
    Tomar el string tal cual está en la base, codificarlo como 'cp850'
    (recupera los bytes originales) y decodificarlo como 'utf-8'
    (recupera el texto correcto). Si el texto YA está bien, la operación
    falla (UnicodeDecodeError) y se deja tal cual -> el script es seguro
    de correr más de una vez (idempotente).

Uso:
    pip install psycopg2-binary --break-system-packages
    python3 fix_encoding.py

Ajustá los datos de conexión más abajo (DB_HOST, DB_PORT, etc.) según cómo
esté expuesto tu contenedor de Docker. Si corrés este script DESDE OTRO
contenedor en la misma red de Docker, usá el nombre del servicio/contenedor
como DB_HOST en vez de "localhost".

Contexto del proyecto PediloYA (según el instructivo de importación):
  - Contenedor: usuario-db
  - Base de datos: usuarios_db
  - Usuario: postgres
  - Correr este script DESPUÉS de importar usuarios_db.sql y ANTES de
    reiniciar los microservicios (docker compose restart).
"""

import sys

try:
    import psycopg2
except ImportError:
    print("Falta psycopg2. Instalalo con:")
    print("  pip install psycopg2-binary --break-system-packages")
    sys.exit(1)

# ------------------------------------------------------------------
# CONFIGURÁ ACÁ TU CONEXIÓN
# Si el contenedor usuario-db no publica el puerto 5432 al host, revisá
# con "docker port usuario-db" qué puerto usar, o corré este script
# copiándolo dentro del contenedor (ver instrucciones abajo).
# ------------------------------------------------------------------
DB_HOST = "localhost"      # o el nombre del contenedor si corrés esto desde otro contenedor de la red
DB_PORT = 5431             # según "docker port usuario-db" -> 5432/tcp -> 0.0.0.0:5431
DB_NAME = "usuarios_db"
DB_USER = "postgres"
DB_PASS = "admin"       # ajustá si tu docker-compose usa otra contraseña
# ------------------------------------------------------------------

# Tablas y columnas de texto a corregir, con su clave primaria
TABLES = {
    "provincia": {"pk": "id", "columns": ["nombre"]},
    "localidad": {"pk": "id", "columns": ["nombre"]},
    "direccion": {"pk": "id", "columns": ["calle", "observaciones"]},
}


def fix_text(value):
    """Intenta revertir el mojibake CP850->UTF-8. Si no aplica, devuelve el original."""
    if value is None:
        return value, False
    try:
        fixed = value.encode("cp850").decode("utf-8")
    except (UnicodeDecodeError, UnicodeEncodeError):
        return value, False
    if fixed != value:
        return fixed, True
    return value, False


def main():
    conn = psycopg2.connect(
        host=DB_HOST, port=DB_PORT, dbname=DB_NAME, user=DB_USER, password=DB_PASS
    )
    conn.autocommit = False
    cur = conn.cursor()

    total_updates = 0

    for table, meta in TABLES.items():
        pk = meta["pk"]
        columns = meta["columns"]
        col_list = ", ".join(columns)

        cur.execute(f"SELECT {pk}, {col_list} FROM {table}")
        rows = cur.fetchall()

        updates_in_table = 0
        for row in rows:
            row_id = row[0]
            original_values = row[1:]

            fixed_values = []
            changed = False
            for v in original_values:
                fv, was_changed = fix_text(v)
                fixed_values.append(fv)
                changed = changed or was_changed

            if changed:
                set_clause = ", ".join(f"{c} = %s" for c in columns)
                cur.execute(
                    f"UPDATE {table} SET {set_clause} WHERE {pk} = %s",
                    (*fixed_values, row_id),
                )
                updates_in_table += 1

        print(f"{table}: {updates_in_table} filas corregidas de {len(rows)}")
        total_updates += updates_in_table

    conn.commit()
    cur.close()
    conn.close()
    print(f"\nListo. Total de filas corregidas: {total_updates}")


if __name__ == "__main__":
    main()
