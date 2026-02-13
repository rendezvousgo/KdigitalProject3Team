package com.backend.backend.board.service;

import com.backend.backend.board.entity.Board;
import com.backend.backend.board.repository.BoardRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BoardService {
    private final BoardRepository boardRepository;

    // 湲 ???
    public void register(Board board) {
        boardRepository.save(board);
    }

    // 湲 紐⑸줉 媛?몄삤湲?
    public List<Board> getList() {
        return boardRepository.findAll();
    }

    // 湲 ?섎굹 媛?몄삤湲?
    public Board read(Long id) {
        return boardRepository.findById(id).orElseThrow();
    }

    // 湲 ??젣
    public void remove(Long id) {
        boardRepository.deleteById(id);
    }
}