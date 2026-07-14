"use client";

import { FormEvent, useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { useDemo } from "@/components/providers/DemoProvider";
import { can } from "@/lib/permissions";
import { roleLabels } from "@/lib/utils";

export function CommentSection() {
  const { role, notify } = useDemo();
  const [text, setText] = useState("");
  const [comments, setComments] = useState([{ id: 1, author: "村民代表", text: "希望方案保留足够的日常通行空间。", time: "2026-07-12" }, { id: 2, author: "规划协作者", text: "可以先做可移动设施样段，再根据使用反馈调整。", time: "2026-07-13" }]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!can(role, "comment")) { notify("游客不能提交评论", "请切换为村民、协作者或管理员角色。" ); return; }
    if (text.trim().length < 3) { notify("评论内容过短", "请至少输入 3 个字。" ); return; }
    setComments((current) => [...current, { id: Date.now(), author: roleLabels[role], text: text.trim(), time: "刚刚" }]);
    setText("");
    notify("评论已发布", "内容已作为演示数据加入讨论。", "success");
  };
  return (
    <section className="comment-section"><h3><MessageCircle size={20} />讨论与建议</h3><div className="comment-list">{comments.map((comment) => <article key={comment.id}><span className="comment-avatar">{comment.author[0]}</span><div><strong>{comment.author}</strong><time>{comment.time}</time><p>{comment.text}</p></div></article>)}</div><form onSubmit={submit}><label htmlFor="comment-text">发表你的看法</label><div><textarea id="comment-text" value={text} onChange={(event) => setText(event.target.value)} placeholder="请具体说明你的观察或建议……" /><button className="button button-primary" type="submit"><Send size={17} />提交评论</button></div></form></section>
  );
}
