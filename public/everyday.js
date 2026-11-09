import {habitsView, mountHabits} from './habits.js?v=20261114-15';
import {localDay, habitDays} from './habit-utils.js?v=20261114-15';
export {habitsView, localDay, habitDays};
import {listsView, mountLists} from './lists.js?v=20261114-9';
export {listsView};
import {bookmarksView, mountBookmarks, safeBookmarkURL} from './bookmarks.js?v=20261114-16';
export {bookmarksView, safeBookmarkURL};
// Everyday tools are stored in the account's existing progress record.
export function mountEveryday({root,state,save,render,toast,onReward=()=>0,win=window,userId='guest'}) {
 if(root.querySelector('#habitsWorkspace'))return mountHabits({root,state,save,toast,onReward,win,userId});
 if(root.querySelector('#bookmarksWorkspace'))return mountBookmarks({root,state,save,win});
 if(root.querySelector('#listsWorkspace'))return mountLists({root,state,save,toast,onReward,win});
 return {destroy(){}};
}
