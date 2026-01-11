# Движок ИИ для Pawn Wars

Модульная структура движка ИИ с возможностью легкого расширения факторов оценки позиции.

## Структура

```
engine/
├── factors/           # Факторы оценки позиции
│   ├── FactorRegistry.js    # Реестр факторов
│   ├── BaseFactor.js        # Базовый класс для факторов
│   ├── LegacyAdapter.js     # Адаптер для старого формата
│   ├── utils.js             # Утилиты для факторов
│   ├── PawnCount.js         # Пример фактора
│   ├── PawnAdvancement.js   # Пример фактора
│   └── ExampleNewFactor.js  # Шаблон для новых факторов
├── search.js          # Алгоритм поиска (Minimax)
├── evaluator.js       # Оценка позиции
├── config.js          # Конфигурации ИИ
└── index.js           # Главный модуль движка
```

## Как добавить новый фактор оценки

### Шаг 1: Создайте файл фактора

Создайте новый файл в папке `engine/factors/`, например `MyNewFactor.js`:

```javascript
const getPawns = (typeof window === 'undefined') 
    ? require('../../game').getPawns 
    : (typeof window !== 'undefined' ? window.getPawns : null);

class MyNewFactor {
    constructor() {
        this.id = 'myNewFactor';
        this.defaultParams = {
            bonusValue: 10
        };
        this.weights = [0, 0.5, 1, 1.5, 2, 5, 10];
        this.iterateParams = {
            bonusValue: [5, 10, 15, 20]
        };
    }

    evaluate(color, params = {}) {
        const { bonusValue = 10 } = { ...this.defaultParams, ...params };
        const getPawnsFn = getPawns || (typeof global !== 'undefined' ? global.getPawns : null);
        if (!getPawnsFn) {
            throw new Error('getPawns function is not available');
        }

        const pawns = getPawnsFn(color);
        // Ваша логика оценки здесь
        return pawns.length * bonusValue;
    }
}

// Регистрация фактора
if (typeof window === 'undefined') {
    const { factorRegistry } = require('./FactorRegistry');
    factorRegistry.register('myNewFactor', new MyNewFactor());
    module.exports = MyNewFactor;
} else if (typeof window !== 'undefined' && window.factorRegistry) {
    window.factorRegistry.register('myNewFactor', new MyNewFactor());
    window.MyNewFactor = MyNewFactor;
}
```

### Шаг 2: Используйте фактор в конфигурации

Добавьте фактор в конфигурацию ИИ (в `engine/config.js` или при создании конфигурации):

```javascript
const config = {
    depth: 4,
    factors: [
        { id: 'myNewFactor', weight: 1.0, params: { bonusValue: 15 } }
    ]
};
```

### Шаг 3: Загрузите фактор

**В Node.js:**
```javascript
require('./engine/factors/MyNewFactor');
```

**В браузере:**
Добавьте script тег в HTML:
```html
<script src="engine/factors/MyNewFactor.js"></script>
```

## API факторов

Каждый фактор должен иметь:

- `id` - уникальный идентификатор
- `defaultParams` - параметры по умолчанию
- `weights` - массив возможных весов для grid search
- `iterateParams` - параметры для перебора в grid search
- `evaluate(color, params)` - метод оценки позиции

## Использование в коде

### Node.js

```javascript
const { findBestMove } = require('./engine');
const result = findBestMove(7); // Уровень сложности 7
```

### Браузер

```javascript
// После загрузки всех модулей
const result = findBestMove(7);
```

## Миграция

Все факторы из старого `factors.js` перенесены в отдельные файлы. Старый файл `factors.js` больше не используется.

## Расширяемость

Система разработана для легкого расширения:
- Добавление новых факторов - просто создайте новый файл
- Настройка параметров - через конфигурацию
- Grid search - автоматически поддерживается через `weights` и `iterateParams`

