import { createQuiz } from './games.js?v=20261107-5';
// A test is deliberately session-only. The underlying cards are never edited.
export function createPractice(cards, count = 10, random = Math.random) {
  if (![5, 10, 20].includes(count)) return null;
  const quiz = createQuiz(cards, random, count);
  if (!quiz) return null;
  return { questions: quiz.questions, answers: Array(quiz.questions.length).fill(null), complete:false, score:0 };
}
export function submitPractice(test, answers) {
  if(!test || test.complete || !Array.isArray(answers) || answers.length!==test.questions.length) return false;
  let answered=0;
  const clean=answers.map((answer,index)=>{
    if(answer===null || answer===undefined || answer==='') return null;
    const id=Number(answer);
    if(!Number.isSafeInteger(id) || !test.questions[index].choices.some(choice=>choice.id===id)) return null;
    answered++;return id;
  });
  if(!answered) return false;
  test.answers=clean;
  test.score=test.questions.reduce((n,question,index)=>n+(question.id===clean[index]?1:0),0);
  test.complete=true;
  return true;
}
