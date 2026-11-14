const SAMPLE_TEXT = `At this point in time, it is important to note that our team is utilizing a wide range of tools in order to examine the data. Furthermore, we are able to review the results on a daily basis. In conclusion, these changes are of great importance to the team.`;

const LIGHT_RULES = [
  [/\bat this point in time\b/gi, 'now'],
  [/\bat the present time\b/gi, 'now'],
  [/\bin order to\b/gi, 'to'],
  [/\bmake use of\b/gi, 'use'],
  [/\bdue to the fact that\b/gi, 'because'],
  [/\bin light of the fact that\b/gi, 'because'],
  [/\bfor the purpose of\b/gi, 'to'],
  [/\bwith regard to\b/gi, 'about'],
  [/\bwith respect to\b/gi, 'about'],
  [/\bin the event that\b/gi, 'if'],
  [/\bprior to\b/gi, 'before'],
  [/\bsubsequent to\b/gi, 'after'],
  [/\bon a daily basis\b/gi, 'daily'],
  [/\bon a weekly basis\b/gi, 'weekly'],
  [/\bin the near future\b/gi, 'soon'],
  [/\beach and every\b/gi, 'every'],
  [/\bin my personal opinion\b/gi, 'in my opinion']
];

const HUMANIZE_RULES = [
  ...LIGHT_RULES,
  [/\bin today's (?:(?:fast-paced|rapidly changing|rapidly evolving) )?(?:digital )?(?:world|landscape)\b/gi, 'today'],
  [/\bin today's digital age\b/gi, 'today'],
  [/\bat the end of the day\b/gi, 'in the end'],
  [/\bin the realm of\b/gi, 'in'],
  [/\bdelving into\b/gi, 'exploring'],
  [/\bdelves into\b/gi, 'explores'],
  [/\bdelved into\b/gi, 'explored'],
  [/\bdelve into\b/gi, 'explore'],
  [/\bit is important to note that\b/gi, ''],
  [/\bit should be noted that\b/gi, ''],
  [/\bit is worth noting that\b/gi, ''],
  [/\bit is worth mentioning that\b/gi, ''],
  [/\bin the process of\b/gi, ''],
  [/\bfurthermore\b/gi, 'also'],
  [/\bmoreover\b/gi, "what's more"],
  [/\badditionally\b/gi, 'also'],
  [/\bfirst and foremost\b/gi, 'first'],
  [/\bin conclusion\b/gi, 'overall'],
  [/\bto summarize\b/gi, 'in short'],
  [/\bto sum up\b/gi, 'overall'],
  [/\bas a result\b/gi, 'so'],
  [/\ba large number of\b/gi, 'many'],
  [/\bthe majority of\b/gi, 'most'],
  [/\ba majority of\b/gi, 'most'],
  [/\ba wide range of\b/gi, 'a range of'],
  [/\bhas the ability to\b/gi, 'can'],
  [/\bhave the ability to\b/gi, 'can'],
  [/\bis able to\b/gi, 'can'],
  [/\bare able to\b/gi, 'can'],
  [/\bwas able to\b/gi, 'could'],
  [/\bwere able to\b/gi, 'could'],
  [/\bis of great importance to\b/gi, 'matters to'],
  [/\bare of great importance to\b/gi, 'matter to'],
  [/\bplays a (?:crucial|critical|pivotal|vital|key|important) role in\b/gi, 'is key to'],
  [/\bplay a (?:crucial|critical|pivotal|vital|key|important) role in\b/gi, 'are key to'],
  [/\bunlock the full potential of\b/gi, 'make the most of'],
  [/\bnavigating the complexities of\b/gi, 'dealing with'],
  [/\bthe intricate tapestry of\b/gi, 'the complex mix of'],
  [/\butilizing\b/gi, 'using'],
  [/\butilises\b/gi, 'uses'],
  [/\butilizes\b/gi, 'uses'],
  [/\butilised\b/gi, 'used'],
  [/\butilized\b/gi, 'used'],
  [/\butilise\b/gi, 'use'],
  [/\butilize\b/gi, 'use'],
  [/\bseamless\b/gi, 'smooth'],
  [/\bfacilitates\b/gi, 'supports'],
  [/\bfacilitate\b/gi, 'support'],
  [/\bfacilitated\b/gi, 'supported'],
  [/\bfacilitating\b/gi, 'supporting'],
  [/\bdemonstrates\b/gi, 'shows'],
  [/\bdemonstrate\b/gi, 'show'],
  [/\bdemonstrated\b/gi, 'showed'],
  [/\bdemonstrating\b/gi, 'showing'],
  [/\bapproximately\b/gi, 'about']
];

const CONVERSATIONAL_RULES = [
  [/\bcommences\b/gi, 'starts'],
  [/\bcommence\b/gi, 'start'],
  [/\bcommenced\b/gi, 'started'],
  [/\bcommencing\b/gi, 'starting'],
  [/\bobtains\b/gi, 'gets'],
  [/\bobtain\b/gi, 'get'],
  [/\bobtained\b/gi, 'got'],
  [/\bendeavour\b/gi, 'try'],
  [/\bendeavours\b/gi, 'tries'],
  [/\bendeavoured\b/gi, 'tried'],
  [/\bendeavouring\b/gi, 'trying']
];

const NATURAL_CONTRACTIONS = [
  [/\bdo not\b/gi, "don't"],
  [/\bdoes not\b/gi, "doesn't"],
  [/\bdid not\b/gi, "didn't"],
  [/\bcannot\b/gi, "can't"],
  [/\bcan not\b/gi, "can't"],
  [/\bwill not\b/gi, "won't"],
  [/\bwould not\b/gi, "wouldn't"],
  [/\bcould not\b/gi, "couldn't"],
  [/\bshould not\b/gi, "shouldn't"],
  [/\bI am\b/g, "I'm"],
  [/\b(you|we|they) are\b/gi, "$1're"]
];

const CONVERSATIONAL_CONTRACTIONS = [
  ...NATURAL_CONTRACTIONS,
  [/\b(it|that|there|here|what|who) is\b/gi, "$1's"],
  [/\bI have\b/g, "I've"],
  [/\b(you|we|they) have\b/gi, "$1've"],
  [/\bI will\b/g, "I'll"],
  [/\b(you|we|they) will\b/gi, "$1'll"],
  [/\bI would\b/g, "I'd"]
];

const FORMAL_EXPANSIONS = [
  [/\bcan't\b/gi, 'cannot'],
  [/\bwon't\b/gi, 'will not'],
  [/\bdon't\b/gi, 'do not'],
  [/\bdoesn't\b/gi, 'does not'],
  [/\bdidn't\b/gi, 'did not'],
  [/\bisn't\b/gi, 'is not'],
  [/\baren't\b/gi, 'are not'],
  [/\bwasn't\b/gi, 'was not'],
  [/\bweren't\b/gi, 'were not'],
  [/\bhaven't\b/gi, 'have not'],
  [/\bhasn't\b/gi, 'has not'],
  [/\bhadn't\b/gi, 'had not'],
  [/\bwouldn't\b/gi, 'would not'],
  [/\bcouldn't\b/gi, 'could not'],
  [/\bshouldn't\b/gi, 'should not']
];

function preserveInitialCase(source, replacement) {
  if (!replacement) return '';
  if (source.toLocaleUpperCase() === source) return replacement.toLocaleUpperCase();
  if (source[0] && source[0] === source[0].toLocaleUpperCase()) {
    return replacement[0].toLocaleUpperCase() + replacement.slice(1);
  }
  return replacement;
}

function replaceRules(source, rules) {
  let text = source;
  let edits = 0;
  for (const [pattern, replacement] of rules) {
    text = text.replace(pattern, (match, ...args) => {
      edits += 1;
      const captures = args.slice(0, -2);
      const resolved = typeof replacement === 'function'
        ? replacement(match, ...captures)
        : replacement.replace(/\$(\d)/g, (_, index) => captures[Number(index) - 1] ?? '');
      return preserveInitialCase(match, resolved);
    });
  }
  return {text, edits};
}

function normalizeText(text) {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\s+([,.;!?])/g, '$1')
    .replace(/([,;])(?=\S)/g, '$1 ')
    .replace(/([.!?])(?=[A-Za-z])/g, '$1 ')
    .replace(/(^|\n+|[.!?]\s+)([a-z])/g, (_, prefix, letter) => prefix + letter.toLocaleUpperCase())
    .replace(/^\s*[,;]\s*/gm, '')
    .trim();
}

export function countTextWords(text) {
  return (String(text).match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu) || []).length;
}

export function countTextSentences(text) {
  const trimmed = String(text).trim();
  return trimmed ? (trimmed.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || []).filter(sentence => sentence.trim()).length : 0;
}

export function humanizeText(source, style = 'natural') {
  const input = String(source ?? '');
  const aliases = {clear: 'natural', friendly: 'conversational', formal: 'professional'};
  const selectedStyle = aliases[style] || style;
  const rules = selectedStyle === 'light' ? LIGHT_RULES : HUMANIZE_RULES;
  const rewritten = replaceRules(input, rules);
  let text = rewritten.text;
  let edits = rewritten.edits;

  if (selectedStyle === 'conversational') {
    const casual = replaceRules(text, CONVERSATIONAL_RULES);
    text = casual.text;
    edits += casual.edits;
    const contracted = replaceRules(text, CONVERSATIONAL_CONTRACTIONS);
    text = contracted.text;
    edits += contracted.edits;
  } else if (selectedStyle === 'professional') {
    const expanded = replaceRules(text, FORMAL_EXPANSIONS);
    text = expanded.text;
    edits += expanded.edits;
  } else if (selectedStyle !== 'light') {
    const contracted = replaceRules(text, NATURAL_CONTRACTIONS);
    text = contracted.text;
    edits += contracted.edits;
  }

  const normalized = normalizeText(text);
  if (normalized !== text) edits += 1;

  return {
    text: normalized,
    edits,
    words: countTextWords(normalized),
    sentences: countTextSentences(normalized)
  };
}

export function textRewriterView() {
  return `<div class="text-editor-app">
    <div class="text-editor-notice" role="note"><strong>Local humanizer</strong><span>Uses on-device language rules to rephrase stiff wording, trim filler and smooth flow. Nothing is sent or saved. Review the result and keep any wording that feels like you.</span></div>
    <div class="text-editor-toolbar">
      <label for="textEditStyle">Voice
        <select id="textEditStyle">
          <option value="light">Light touch</option>
          <option value="natural" selected>Natural voice</option>
          <option value="conversational">Conversational</option>
          <option value="professional">Professional</option>
        </select>
      </label>
      <div class="text-editor-actions">
        <button type="button" class="btn dark" id="textEditRun">Humanize draft</button>
        <button type="button" class="text-editor-secondary" id="textEditSample">Load sample</button>
        <button type="button" class="text-editor-secondary" id="textEditClear">Clear</button>
      </div>
    </div>
    <div class="text-editor-workspace">
      <section class="text-editor-column" aria-labelledby="textEditInputLabel">
        <div class="text-editor-column-head"><label id="textEditInputLabel" for="textEditInput">Your draft</label><span id="textEditInputCount">0 words</span></div>
        <textarea id="textEditInput" rows="12" placeholder="Paste or write a draft to make it sound more natural…" spellcheck="true"></textarea>
      </section>
      <section class="text-editor-column" aria-labelledby="textEditOutputLabel">
        <div class="text-editor-column-head"><label id="textEditOutputLabel" for="textEditOutput">Humanized draft</label><span id="textEditOutputCount">0 words</span></div>
        <textarea id="textEditOutput" rows="12" placeholder="Your humanized draft will appear here. Review and edit it before copying." spellcheck="true"></textarea>
      </section>
    </div>
    <div class="text-editor-result-row">
      <p id="textEditStatus" class="text-editor-status" role="status" aria-live="polite">Your text stays on this device. Nothing is saved when you leave.</p>
      <div class="text-editor-actions"><button type="button" class="text-editor-secondary" id="textEditUse">Use humanized draft</button><button type="button" class="text-editor-secondary" id="textEditCopy">Copy humanized draft</button></div>
    </div>
  </div>`;
}

export function mountTextRewriter({root, win = window}) {
  const $ = selector => root.querySelector(selector);
  const input = $('#textEditInput');
  const output = $('#textEditOutput');
  const style = $('#textEditStyle');
  const status = $('#textEditStatus');
  if (!input || !output || !style || !status) return {destroy() {}};

  const updateCounts = () => {
    $('#textEditInputCount').textContent = `${countTextWords(input.value)} words`;
    $('#textEditOutputCount').textContent = `${countTextWords(output.value)} words`;
  };
  const edit = () => {
    if (!input.value.trim()) {
      status.textContent = 'Type or paste a draft first, then choose Humanize draft.';
      input.focus();
      return;
    }
    const result = humanizeText(input.value, style.value);
    output.value = result.text;
    updateCounts();
    status.textContent = result.edits
      ? `${result.edits} wording ${result.edits === 1 ? 'change' : 'changes'} made · ${result.words} words · ${result.sentences} sentences. Review the result before using it.`
      : `No wording changes were needed · ${result.words} words · ${result.sentences} sentences. Review the draft before using it.`;
  };
  const loadSample = () => {
    input.value = SAMPLE_TEXT;
    updateCounts();
    input.focus();
    status.textContent = 'Sample loaded. Choose Humanize draft to make the wording more natural.';
  };
  const clear = () => {
    input.value = '';
    output.value = '';
    updateCounts();
    status.textContent = 'Draft and humanized version cleared.';
    input.focus();
  };
  const useEdit = () => {
    if (!output.value.trim()) {
      status.textContent = 'There is no humanized draft to use yet.';
      return;
    }
    input.value = output.value;
    updateCounts();
    status.textContent = 'The humanized version is now your draft. Make any final changes you like.';
    input.focus();
  };
  const copy = async () => {
    if (!output.value.trim()) {
      status.textContent = 'There is no humanized draft to copy yet.';
      return;
    }
    try {
      if (!win.navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await win.navigator.clipboard.writeText(output.value);
      status.textContent = 'Humanized draft copied to the clipboard.';
    } catch {
      output.focus();
      output.select();
      status.textContent = 'Clipboard access is unavailable. The humanized draft is selected so you can copy it manually.';
    }
  };

  const onInput = () => updateCounts();
  const onClick = event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.id === 'textEditRun') edit();
    else if (button.id === 'textEditSample') loadSample();
    else if (button.id === 'textEditClear') clear();
    else if (button.id === 'textEditUse') useEdit();
    else if (button.id === 'textEditCopy') copy();
  };
  const onKeyDown = event => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      edit();
    }
  };
  input.addEventListener('input', onInput);
  output.addEventListener('input', onInput);
  root.addEventListener('click', onClick);
  root.addEventListener('keydown', onKeyDown);
  updateCounts();

  return {
    edit,
    destroy() {
      input.removeEventListener('input', onInput);
      output.removeEventListener('input', onInput);
      root.removeEventListener('click', onClick);
      root.removeEventListener('keydown', onKeyDown);
    }
  };
}
