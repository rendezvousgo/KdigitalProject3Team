package com.backend.backend.board.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
public class Comment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;
    private String writer;
    private LocalDateTime createDate = LocalDateTime.now();

    @ManyToOne
    @JoinColumn(name = "board_id")
    @JsonIgnore
    private Board board;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getWriter() { return writer; }
    public void setWriter(String writer) { this.writer = writer; }
    public LocalDateTime getCreateDate() { return createDate; }
    public void setCreateDate(LocalDateTime createDate) { this.createDate = createDate; }
    public Board getBoard() { return board; }
    public void setBoard(Board board) { this.board = board; }
}