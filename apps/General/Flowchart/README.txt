OFFLINE FLOWCHART
=================

Open offline-flowchart.html in Edge or Chrome (double-click). No install, no internet.

WHERE YOUR PROJECTS ARE SAVED
-----------------------------
Folder mode (recommended)
  Press "Choose folder…" once in the Projects panel and pick e.g. Documents\Flowcharts.
  Everything is saved as normal files you can see in Explorer:

    Flowcharts\
      <Project name>\              one folder per project
        project.json               notes + links for the project
        <chart>.mmd / .drawio      the flowchart itself (plain text)
        <chart>.png                image, rewritten on every save
        _versions\                 older copies (last 30 per chart, plus deleted ones)

  After a browser restart, press "Reconnect" once to give permission again.
  To back up or share: copy the folder. To use on another PC: copy the folder and
  choose it there.

Browser mode (fallback, if folder access is blocked)
  Data stays inside this browser profile on this PC only. Clearing browsing data
  deletes it, so press "Backup" regularly (one .json file). "Restore" brings it
  back. "Copy all to folder…" moves everything into folder mode later.

Nothing is ever sent over the network in either mode.

TIP
  In PowerPoint/Excel use Insert > Picture > "Link to File" with the saved PNG.
  Re-saving the flowchart then updates the picture in the document as well.
