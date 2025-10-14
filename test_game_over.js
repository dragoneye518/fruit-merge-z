// 测试游戏结束功能
console.log('测试游戏结束功能');

// 模拟游戏结束
function testGameOver() {
    console.log('触发游戏结束测试');
    
    // 检查游戏对象是否存在
    if (typeof game !== 'undefined' && game.gameLogic) {
        console.log('游戏对象存在，触发gameOver');
        
        // 检查game对象是否已设置
        console.log('gameLogic.game:', game.gameLogic.game);
        console.log('gameLogic.game.stop:', game.gameLogic.game?.stop);
        
        // 触发游戏结束
        game.gameLogic.gameOver();
        
        // 检查游戏是否停止
        setTimeout(() => {
            console.log('游戏运行状态:', game.isRunning);
            console.log('游戏状态:', game.gameLogic.gameState);
        }, 1000);
    } else {
        console.log('游戏对象未找到');
    }
}

// 等待游戏初始化
function waitForGame() {
    if (typeof game !== 'undefined' && game.isInitialized) {
        console.log('游戏已初始化，开始测试');
        testGameOver();
    } else {
        console.log('等待游戏初始化...');
        setTimeout(waitForGame, 1000);
    }
}

// 开始测试
console.log('开始游戏结束测试');
waitForGame();