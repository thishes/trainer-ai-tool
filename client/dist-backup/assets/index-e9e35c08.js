const formatDateTime = (time, format = "YYYY/MM/DD HH:mm") => {
  if (!time)
    return "-";
  let date;
  if (time instanceof Date) {
    date = time;
  } else {
    date = new Date(time);
  }
  if (isNaN(date.getTime()))
    return "-";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return format.replace("YYYY", year).replace("MM", month).replace("DD", day).replace("HH", hours).replace("mm", minutes).replace("ss", seconds);
};
const index = "";
export {
  formatDateTime as f
};
