# Инфраструктура для тестирования findBestMove

Эта инфраструктура позволяет тестировать метод `findBestMove` из `engine/index.js` с поддержкой различных форматов входных данных и удобными утилитами для assert.

## Структура

- `board-parser.js` - Парсеры для разных форматов входных данных
- `assertions.js` - Утилиты для assert на ход и оценку
- `test-framework.js` - Основной фреймворк для тестирования
- `run-tests.js` - Скрипт для запуска тестов
- `example.test.js` - Примеры использования

## Форматы входных данных

### 1. Визуальное представление (результат drawGame() или drawBoard())

```
   +------------------------+
 8 | .  .  .  .  .  .  .  . |
 7 | ♟  ♟  .  .  .  .  .  . |
 6 | .  .  ♟  ♟  ♟  ♟  ♟  ♟ |
 5 | .  .  .  .  .  ♗  .  . |
 4 | .  .  ♗  ♗  ♗  .  ♗  . |
 3 | .  .  .  .  .  .  .  . |
 2 | ♗  ♗  .  .  .  .  .  ♗ |
 1 | .  .  .  .  .  .  .  . |
   +------------------------+
     a  b  c  d  e  f  g  h
```

### 2. Строка с ходами из URL (формат &moves=)

```
1.+e3+g6+2.+d4+e6+3.+f4+d6+4.+e4+c6+5.+c4+f6+6.+g4+h6+7.+f5
```

### 3. Строка с ходами в формате PGN (под доской)

```
1. e3 g6 2. d4 e6 3. f4 d6 4. e4 c6 5. c4 f6 6. g4 h6 7. f5 
```

## Использование

### Создание теста

Создайте файл `*.test.js` в директории `test/`:

```javascript
const { setupBoard, runFindBestMove, test } = require('./test-framework.js');
const { assertMove, assertMoveIn, assertScoreRange } = require('./assertions.js');

const myTest = test('My test name', () => {
    // Задаем состояние доски (любой формат)
    setupBoard('1. e4 e5 2. d4 d5');
    
    // Запускаем findBestMove с конфигурацией AI
    const result = runFindBestMove(2); // или объект конфигурации
    
    // Проверяем результат
    assertMove(result, 'e5'); // Ожидаемый ход
    // или
    assertMoveIn(result, ['e5', 'e6', 'd5']); // Ход среди вариантов
    // или
    assertScoreRange(result, -100, 100); // Оценка в диапазоне
});

module.exports = [myTest];
```

### Доступные assert функции

- `assertMove(result, expectedMove, message?)` - Проверяет, что найденный ход равен ожидаемому
- `assertMoveIn(result, expectedMoves, message?)` - Проверяет, что найденный ход находится среди ожидаемых
- `assertScoreRange(result, minScore, maxScore, message?)` - Проверяет, что оценка в заданном диапазоне
- `assertScoreGreater(result, minScore, message?)` - Проверяет, что оценка больше заданного значения
- `assertScoreLess(result, maxScore, message?)` - Проверяет, что оценка меньше заданного значения
- `assertMoveExists(result, message?)` - Проверяет, что ход существует (не null)

### Запуск тестов

Запустить все тесты:
```bash
node test/run-tests.js
```

Запустить конкретный файл:
```bash
node test/run-tests.js example.test.js
```

## Примеры

См. `example.test.js` для примеров использования всех форматов входных данных и различных типов assert.

## Конфигурация AI

Можно передать либо:
- Число (уровень сложности): `2`, `3`, `6`, `7` и т.д.
- Объект конфигурации:
```javascript
const customConfig = {
    depth: 4,
    factors: [
        { id: 'mediumPawnAdvancement', weight: 2.0 },
        { id: 'mediumNextMoveSafety', weight: 2.0 }
    ]
};
runFindBestMove(customConfig);
```

