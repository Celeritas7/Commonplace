import {exampleBundle} from './examples.mjs';
import {renderExcelPreview} from './render.mjs';
const picker=document.querySelector('#scenario'),root=document.querySelector('#lesson');
const render=()=>renderExcelPreview(root,exampleBundle(picker.value));picker.addEventListener('change',render);render();
