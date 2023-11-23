import React, {useEffect, useRef, useMemo, useCallback, useState} from 'react';
import { styled } from "@mui/material/styles";
import ExamSchedule from "./ExamSchedule";
import {ACTSchedules, TaskType} from '../../util/examSubjects'
import {selectedTaskIdAtom, selectedExamAtom} from "../../recoil/timerState";
import {useRecoilState, useRecoilValue} from "recoil";
import {optAutoStartNextAtom, optReadyTimeAtom} from "../../recoil/settingOptionState";
import {TimerDisplay} from "./TimerDisplay";

const Action = {
  TICK_TIME_LEFT: "tick_time_left",
  TICK_READY_TIME_LEFT: "tick_ready_time_left",
  TOGGLE_TIMER: "toggle_timer",
  NEXT_SUBJECT: "next_subject",
  ACTIVE_SUBJECT_CHANGE: "active_subject_chane",
}


function getNextTimerOnState(type, timeLeft, subjectId, optAutoStartNext) {
  if (type === TaskType.PREP)
    return true
  if (timeLeft < 0)
    return optAutoStartNext
  return false
}

export default function ExamTimer() {
  const subjects = useRecoilValue(selectedExamAtom);
  const optAutoStartNext = useRecoilValue(optAutoStartNextAtom)
  const optReadyTime = useRecoilValue(optReadyTimeAtom)
  const [selectedSubjectId, setSelectedSubjectId] = useRecoilState(selectedTaskIdAtom);

  const [timerState, setTimerState] = useState({
    timeLeft: 0,
    timerOn: false,
    readyTimeLeft: optReadyTime,
    isReadyPhase: optReadyTime > 0,
  });
  const { timeLeft, timerOn, readyTimeLeft, isReadyPhase } = timerState

  const timeRef = useRef(null)
  const activeSubject = useMemo(() => subjects[selectedSubjectId], [subjects, selectedSubjectId])

  const reducer = useCallback((action) => {
    const payload = action.payload
    switch(action.type) {
      case Action.TICK_TIME_LEFT:
        return setTimerState(prev => ({...prev, timeLeft: prev.timeLeft - 1}));

      case Action.TICK_READY_TIME_LEFT:
        return setTimerState(prev => ({...prev, readyTimeLeft: prev.readyTimeLeft - 1}))

      case Action.TOGGLE_TIMER:
        return setTimerState(prev => ({...prev, timerOn: !prev.timerOn}));

      case Action.NEXT_SUBJECT:
        return setSelectedSubjectId((prev) => (prev < subjects.length-1)? prev+1 : prev)

      case Action.ACTIVE_SUBJECT_CHANGE:
        return setTimerState(prev => {
          const activeSubject = payload.activeSubject
          const timerOn = getNextTimerOnState(activeSubject.type, prev.timeLeft, activeSubject.subjectId, optAutoStartNext)
          const isReadyPhase = (activeSubject.type === TaskType.SUBJECT && optReadyTime>0)
          return {...prev, timeLeft: activeSubject.duration, timerOn: timerOn, readyTimeLeft: optReadyTime, isReadyPhase: isReadyPhase}
        })

      default: return;
    }
  }, [optAutoStartNext, setSelectedSubjectId, subjects.length, optReadyTime])

  // On Timer On or Off
  useEffect(() => {
    if (timerOn && isReadyPhase && readyTimeLeft > 0) {
      timeRef.current = setInterval(() => {
        reducer({ type: Action.TICK_READY_TIME_LEFT, payload: null})
      }, 1000);
    }
    else if (timerOn && timeLeft > -1) {
      timeRef.current = setInterval(() => {
        reducer({ type: Action.TICK_TIME_LEFT, payload: null})
      }, 1000);
    }
    else clearInterval(timeRef.current);

    return () => clearInterval(timeRef.current);
  }, [isReadyPhase, readyTimeLeft, timeLeft, reducer, timerOn]);

  // Switch to exam timer when preparation time is over
  useEffect(() => {
    if (isReadyPhase && readyTimeLeft <= 0) {
      setTimerState(prev => ({
        ...prev,
        isReadyPhase: false,
        timeLeft: activeSubject.duration,
        timerOn: true
      }));
    }
  }, [readyTimeLeft, isReadyPhase, activeSubject.duration]);

  // On Time Over
  useEffect(() => {
    if (timeLeft < 0 && activeSubject.type !== TaskType.BEGIN)
      reducer({type: Action.NEXT_SUBJECT, payload: null})
  }, [reducer, timeLeft]);

  // On Active Subject Change
  useEffect(() => {
    reducer({type: Action.ACTIVE_SUBJECT_CHANGE, payload: {activeSubject: activeSubject}})
  }, [reducer, activeSubject])

  return (
    <TimerBase>
      <ExamTitleBox>
        <ExamTitle>ACT</ExamTitle>
      </ExamTitleBox>
      <TimerDisplay
        reducer={reducer}
        action={Action}
        activeSubject={activeSubject}
        timeLeft={isReadyPhase ? readyTimeLeft : timeLeft}
        timerOn={timerOn}
        isReadyPhase={isReadyPhase}
      />
      <ExamSchedule schedules={ACTSchedules}/>
    </TimerBase>
  )
}

// Styled components here
const TimerBase = styled('div')({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
});

const ExamTitleBox = styled('div')({
  display:'flex',
  flex:'0 0 5rem',
  alignItems:'center',
  justifyContent:'center',
  marginTop: '5rem',
  width:'100%',
});

const ExamTitle = styled('div')({
  textAlign:'center',
  fontSize:'1.6rem',
  fontWeight:'800',
  border: '1px solid white',
  borderRadius: '1rem',
  padding: '1rem',
})
