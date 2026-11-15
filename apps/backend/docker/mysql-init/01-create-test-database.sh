#!/bin/sh
# Runs once, when the MySQL volume is created. Adds the test database (used by `yarn test-integ`)
# and gives the app user access to it. The main database is created by the MYSQL_DATABASE setting.
set -e

TEST_DATABASE="${MYSQL_TEST_DATABASE:-${MYSQL_DATABASE}_test}"

mysql -uroot -p"$MYSQL_ROOT_PASSWORD" <<SQL
CREATE DATABASE IF NOT EXISTS \`${TEST_DATABASE}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
GRANT ALL PRIVILEGES ON \`${TEST_DATABASE}\`.* TO '${MYSQL_USER}'@'%';
FLUSH PRIVILEGES;
SQL
