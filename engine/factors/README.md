# Факторы оценки позиции

Все факторы оценки позиции разбиты на отдельные файлы для удобства расширения и поддержки.

## Структура

Каждый фактор - это отдельный файл, который:
1. Определяет класс фактора с методом `evaluate(color, params)`
2. Автоматически регистрируется в `FactorRegistry` при загрузке
3. Работает как в браузере, так и в Node.js

## Список факторов

### Medium факторы (основной алгоритм - evaluateBoardMedium)
- `MediumPawnAdvancement.js` - Продвижение пешек: (8 - расстояние_до_превращения)
- `MediumCenterColumnBonus.js` - Бонус за центр: количество пешек в колонках 1-6
- `MediumNextMoveSafety.js` - Безопасность следующего хода: количество пешек с безопасным ходом вперед
- `MediumFreePath.js` - Свободный путь: количество пешек без блокировки на вертикали
- `MediumAdjacentThreat.js` - Боковая угроза: количество ситуаций с вражеской пешкой рядом

### Базовые факторы
- `PawnCount.js` - Количество пешек (материальное преимущество)
- `PawnAdvancement.js` - Продвижение пешек (старая версия с бонусами)
- `PawnAdvancementAdvanced.js` - Продвижение пешек (улучшенная версия)

### Продвинутые факторы
- `PassedPawnsPhaseAdaptive.js` - Проходные пешки с адаптацией к стадии игры
- `PromotionRace.js` - Гонка проходных пешек
- `BlockedPawns.js` - Заблокированные свои пешки (штраф)
- `OpponentBlockedPawns.js` - Блокировка пешек противника (бонус)
- `PawnIslands.js` - Пешечные острова (штраф за изолированные группы)
- `IsolatedPawns.js` - Изолированные пешки (штраф)
- `ConnectedPawns.js` - Связанные пешки (бонус за защиту)
- `Mobility.js` - Мобильность (количество легальных ходов)
- `OpponentRestriction.js` - Ограничение противника (бонус за атакуемые клетки)
- `KeySquareControl.js` - Контроль ключевых полей
- `ThreatenedPawns.js` - Атакуемые свои пешки (штраф)
- `PotentialCaptures.js` - Потенциальные взятия (бонус)
- `PawnMajority.js` - Пешечное большинство на фланге
- `OpeningTempo.js` - Темп в дебюте (бонус за двойные ходы)

## Как добавить новый фактор

1. Создайте файл в этой папке (например, `MyNewFactor.js`)
2. Используйте шаблон из `ExampleNewFactor.js`
3. Реализуйте метод `evaluate(color, params)`
4. Фактор автоматически зарегистрируется при загрузке

Пример:

```javascript
class MyNewFactor {
    constructor() {
        this.id = 'myNewFactor';
        this.defaultParams = { bonus: 10 };
        this.weights = [0, 1, 2];
        this.iterateParams = { bonus: [5, 10, 15] };
    }

    evaluate(color, params = {}) {
        const { bonus = 10 } = { ...this.defaultParams, ...params };
        // Ваша логика оценки
        return score;
    }
}

// Регистрация
if (typeof window === 'undefined') {
    const { factorRegistry } = require('./FactorRegistry');
    factorRegistry.register('myNewFactor', new MyNewFactor());
    module.exports = MyNewFactor;
} else if (typeof window !== 'undefined' && window.factorRegistry) {
    window.factorRegistry.register('myNewFactor', new MyNewFactor());
    window.MyNewFactor = MyNewFactor;
}
```

5. Добавьте фактор в `engine/factors/index.js` для автоматической загрузки (Node.js)
6. Добавьте script тег в `index.html` для загрузки в браузере
7. Используйте в конфигурации ИИ (`engine/config.js`)

## Зависимости

Все факторы используют:
- `getPawns(color)` - из `game.js` для получения пешек
- `game.board()` - для получения доски
- `isSafe(r, c)` и `getPiece(r, c, board)` - из `utils.js` для работы с доской

Эти зависимости автоматически доступны через глобальные объекты или require.

