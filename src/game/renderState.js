import { JUDGES, LOGICAL_HEIGHT, LOGICAL_WIDTH, STAGES } from './rules.js'

export function buildRenderState(state) {
  const run = state.run
  return {
    logicalWidth: LOGICAL_WIDTH,
    logicalHeight: LOGICAL_HEIGHT,
    screen: state.screen,
    time: state.time,
    save: {
      coins: state.save.coins,
      highScore: state.save.highScore,
      ftueCompleted: state.save.ftueCompleted,
      settings: { ...state.save.settings },
    },
    judges: JUDGES.map((judge) => ({
      id: judge.id,
      name: judge.name,
      color: judge.color,
      imageId: judge.imageId,
      equippedSkin: state.save.equippedSkins[judge.id] || 'default',
    })),
    stages: STAGES.map((stage) => ({
      id: stage.id,
      name: stage.name,
      cardTitle: stage.cardTitle,
      color: stage.cardColor,
      portraitId: stage.portraitId,
      best: state.save.stageBests[stage.id] || null,
    })),
    run: run ? serializeRun(run) : null,
    toast: state.toast ? { ...state.toast } : null,
    uiButtons: (state.ui?.buttons || []).map((button) => ({ ...button })),
  }
}

function serializeRun(run) {
  return {
    mode: run.mode,
    status: run.status,
    completed: run.completed,
    failed: run.failed,
    grade: run.grade,
    score: run.score,
    combo: run.combo,
    bestCombo: run.bestCombo,
    hp: run.hp,
    elapsed: run.elapsed,
    duration: run.duration,
    activeJudgeIndex: run.activeJudgeIndex,
    caption: run.caption,
    captionUntil: run.captionUntil,
    targets: run.targets.map(serializeTarget),
  }
}

function serializeTarget(target) {
  const base = {
    id: target.id,
    kind: target.kind,
    x: target.x,
    y: target.y,
    age: target.age,
    approach: target.approach,
    deadline: target.deadline,
    resolved: Boolean(target.resolved),
    hitQuality: target.hitQuality || null,
  }
  if (target.kind === 'slide') {
    return {
      ...base,
      endX: target.endX,
      endY: target.endY,
      controlX: target.controlX,
      controlY: target.controlY,
      progress: target.progress || 0,
      dragging: Boolean(target.dragging),
    }
  }
  if (target.kind === 'hold') {
    return {
      ...base,
      holdDuration: target.holdDuration,
      heldFor: target.heldFor,
      holding: Boolean(target.holding),
    }
  }
  return base
}
